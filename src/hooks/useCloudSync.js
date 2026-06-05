import { useState, useEffect, useCallback } from "react";
import { supabase, webSupabase, getTenantId, generateProductId } from "../utils/supabase";
import { useAuthStore } from "./store/useAuthStore";
import { useOfflineQueue } from "./useOfflineQueue";
import { storageService } from "../utils/storageService";

export function useCloudSync() {
  const { isOnline, queue, addToQueue, processQueue, queuedCount } = useOfflineQueue();
  const [syncStatus, setSyncStatus] = useState("idle"); // 'idle' | 'syncing' | 'success' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem("pda_last_sync_time") || null;
  });
  const [syncError, setSyncError] = useState(null);

  const getPendingSalesCount = useCallback(() => {
    return queue.filter(job => job.action === "UPLOAD_SALE").length;
  }, [queue]);

  const sync = useCallback(async () => {
    if (!isOnline) {
      const errStr = "Sin conexión a internet. No se puede sincronizar.";
      setSyncError(errStr);
      setSyncStatus("error");
      return;
    }

    // Evitar llamadas de sync si no hay sesión iniciada en la nube (degradación progresiva offline)
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      console.log("[useCloudSync] Sincronización omitida: Usuario no autenticado en la nube.");
      setSyncStatus("idle");
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    const tenantId = getTenantId();
    const deviceId = localStorage.getItem("pda_device_id") || "browser-pos";
    let recordsSynced = 0;

    try {
      // Asegurar que el tenant existe en web_config antes de procesar ventas o productos
      try {
        const { data: configExists, error: configCheckError } = await webSupabase
          .from("web_config")
          .select("tenant_id")
          .eq("tenant_id", tenantId)
          .maybeSingle();
        
        if (!configExists && !configCheckError) {
          console.log(`[useCloudSync] Creando configuración de tenant preventivo en web_config para: ${tenantId}`);
          const tempSlug = `negocio-${tenantId.substring(0, 8)}`;
          await webSupabase
            .from("web_config")
            .insert({
              tenant_id: tenantId,
              slug: tempSlug,
              business_name: "Mi Negocio",
              exchange_rate: 1.0
            });
        }
      } catch (configErr) {
        console.warn("[useCloudSync] Error en verificación preventiva de web_config:", configErr);
      }

      // --- 1. PROCESAR COLA OFFLINE (PUSH) ---
      console.log("[useCloudSync] Procesando cola de ventas locales...");
      const actionHandlers = {
        UPLOAD_SALE: async (sale) => {
          const { error } = await webSupabase
            .from("web_orders")
            .upsert({
              id: sale.id,
              tenant_id: tenantId,
              customer_name: sale.customerName || "Consumidor Final",
              customer_phone: sale.customerPhone || "N/A",
              customer_notes: `Venta POS #${sale.saleNumber || 0}${sale.fiadoUsd > 0 ? " (Fiado)" : ""} - Impreso/Creado en POS`,
              items: sale.items || [],
              total_usd: parseFloat(sale.totalUsd) || 0,
              status: "completed", // Venta completada
              created_at: sale.timestamp || new Date().toISOString()
            }, { onConflict: "id" });

          if (error) {
            console.error("[useCloudSync] Error subiendo venta:", error);
            throw error;
          }
          recordsSynced++;
        }
      };

      const result = await processQueue(actionHandlers);
      console.log("[useCloudSync] Push completado:", result);

      // --- 2. SINCRONIZAR PRODUCTOS (PULL / PUSH CONFLICT RESOLUTION) ---
      console.log("[useCloudSync] Sincronizando catálogo de productos...");

      const localProducts = await storageService.getItem("my_products_v1", []);
      
      const { data: cloudProducts, error: cloudError } = await webSupabase
        .from("web_catalog")
        .select("*")
        .eq("tenant_id", tenantId);

      if (cloudError) throw cloudError;

      const mergedProducts = [...localProducts];
      const cloudUpserts = [];
      let productsUpdatedLocally = false;

      if (cloudProducts && cloudProducts.length > 0) {
        // Mapeamos los productos de la nube para buscar y resolver conflictos
        for (const cloudProd of cloudProducts) {
          const localIdx = mergedProducts.findIndex(p => String(p.id) === String(cloudProd.local_id));

          if (localIdx >= 0) {
            const localProd = mergedProducts[localIdx];
            const localTime = new Date(localProd.updatedAt || localProd.updated_at || 0).getTime();
            const cloudTime = new Date(cloudProd.updated_at || 0).getTime();

            if (cloudTime > localTime) {
              // Nube es más nueva -> Actualizar local
              mergedProducts[localIdx] = {
                ...localProd,
                name: cloudProd.name,
                description: cloudProd.description,
                priceUsdt: parseFloat(cloudProd.price_usd) || 0,
                priceUsd: parseFloat(cloudProd.price_usd) || 0,
                price: parseFloat(cloudProd.price_usd) || 0,
                category: cloudProd.category,
                image: cloudProd.image_url,
                available: cloudProd.is_available,
                prepTime: Number(cloudProd.prep_time) || 10,
                sizes: cloudProd.sizes || [],
                extras: cloudProd.extras || [],
                updatedAt: cloudProd.updated_at,
                source: "CLOUD"
              };
              productsUpdatedLocally = true;
              recordsSynced++;
            } else if (localTime > cloudTime) {
              // Local es más nueva -> Encolar para subir a la nube
              cloudUpserts.push(localProd);
            }
          } else {
            // No existe localmente -> Descargar
            mergedProducts.push({
              id: cloudProd.local_id,
              name: cloudProd.name,
              description: cloudProd.description,
              priceUsdt: parseFloat(cloudProd.price_usd) || 0,
              priceUsd: parseFloat(cloudProd.price_usd) || 0,
              price: parseFloat(cloudProd.price_usd) || 0,
              category: cloudProd.category,
              image: cloudProd.image_url,
              available: cloudProd.is_available,
              prepTime: Number(cloudProd.prep_time) || 10,
              sizes: cloudProd.sizes || [],
              extras: cloudProd.extras || [],
              updatedAt: cloudProd.updated_at,
              _schemaVersion: 2,
              source: "CLOUD"
            });
            productsUpdatedLocally = true;
            recordsSynced++;
          }
        }
      }

      // Buscar productos locales que no están en la nube para subirlos
      for (const localProd of localProducts) {
        const inCloud = cloudProducts?.some(cp => String(cp.local_id) === String(localProd.id));
        if (!inCloud) {
          cloudUpserts.push(localProd);
        }
      }

      // Si hay productos locales más nuevos, los subimos a la nube
      if (cloudUpserts.length > 0) {
        console.log(`[useCloudSync] Subiendo ${cloudUpserts.length} productos más nuevos a la nube...`);
        const mappedUpserts = cloudUpserts.map(p => ({
          id: generateProductId(tenantId, p.id),
          local_id: p.id,
          tenant_id: tenantId,
          name: p.name,
          description: p.description || "",
          price_usd: parseFloat(p.priceUsdt || p.priceUsd || p.price || 0),
          category: p.category || "otros",
          image_url: p.image || "",
          is_available: p.available !== false,
          prep_time: String(p.prepTime || 10),
          sizes: p.sizes || [],
          extras: p.extras || [],
          updated_at: p.updatedAt || p.updated_at || new Date().toISOString()
        }));

        const { error: upsertError } = await webSupabase
          .from("web_catalog")
          .upsert(mappedUpserts, { onConflict: "id" });

        if (upsertError) {
          console.warn("[useCloudSync] Error subiendo catálogo:", upsertError.message);
        } else {
          recordsSynced += cloudUpserts.length;
        }
      }

      // Guardar productos si cambiaron localmente
      if (productsUpdatedLocally) {
        await storageService.setItem("my_products_v1", mergedProducts);
        // Despachamos evento para notificar a otras vistas
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("app_storage_update", { detail: { key: "my_products_v1" } })
          );
        }
      }

      // --- 2.5. SINCRONIZAR OPERADORES/USUARIOS ---
      console.log("[useCloudSync] Sincronizando operadores locales...");
      const { 
        usuarios: localUsers, 
        deletedUserIds, 
        setUsuariosFromSync 
      } = useAuthStore.getState();

      let usersUpdatedLocally = false;

      // 1. Procesar Eliminaciones locales en la nube
      if (deletedUserIds && deletedUserIds.length > 0) {
        console.log(`[useCloudSync] Eliminando ${deletedUserIds.length} operadores en la nube...`);
        const { error: deleteUsersError } = await supabase
          .from("pos_users")
          .delete()
          .eq("user_id", user.id)
          .in("local_id", deletedUserIds);

        if (deleteUsersError) {
          console.warn("[useCloudSync] Error eliminando operadores en la nube:", deleteUsersError.message);
        } else {
          // Si se eliminaron con éxito en la nube, se limpia la cola local
          usersUpdatedLocally = true;
        }
      }

      // 2. Obtener operadores de la nube
      const { data: cloudUsers, error: cloudUsersError } = await supabase
        .from("pos_users")
        .select("*")
        .eq("user_id", user.id);

      if (cloudUsersError) {
        console.warn("[useCloudSync] Error obteniendo operadores de la nube:", cloudUsersError.message);
      } else {
        const mergedUsers = [...localUsers];
        const cloudUserUpserts = [];

        // Resolver conflictos y mapear cambios de nube a local
        if (cloudUsers && cloudUsers.length > 0) {
          for (const cloudUser of cloudUsers) {
            // Si está en la cola de eliminados locales, omitir
            if (deletedUserIds?.includes(cloudUser.local_id)) continue;

            const localIdx = mergedUsers.findIndex(u => String(u.id) === String(cloudUser.local_id));

            if (localIdx >= 0) {
              const localUser = mergedUsers[localIdx];
              const localTime = new Date(localUser.updatedAt || localUser.updated_at || 0).getTime();
              const cloudTime = new Date(cloudUser.updated_at || 0).getTime();

              if (cloudTime > localTime) {
                // La nube es más reciente -> Actualizar local
                mergedUsers[localIdx] = {
                  ...localUser,
                  nombre: cloudUser.nombre,
                  rol: cloudUser.rol,
                  pin: cloudUser.pin,
                  pinHashed: cloudUser.pin_hashed !== false,
                  updatedAt: cloudUser.updated_at
                };
                usersUpdatedLocally = true;
                recordsSynced++;
              } else if (localTime > cloudTime) {
                // El local es más reciente -> Encolar para subir a la nube
                cloudUserUpserts.push(localUser);
              }
            } else {
              // No existe localmente -> Descargar de la nube
              mergedUsers.push({
                id: cloudUser.local_id,
                nombre: cloudUser.nombre,
                rol: cloudUser.rol,
                pin: cloudUser.pin,
                pinHashed: cloudUser.pin_hashed !== false,
                updatedAt: cloudUser.updated_at
              });
              usersUpdatedLocally = true;
              recordsSynced++;
            }
          }
        }

        // Buscar usuarios locales que no están en la nube para subirlos
        for (const localUser of localUsers) {
          const inCloud = cloudUsers?.some(cu => String(cu.local_id) === String(localUser.id));
          if (!inCloud && !(deletedUserIds?.includes(localUser.id))) {
            cloudUserUpserts.push(localUser);
          }
        }

        // Si hay usuarios locales nuevos/actualizados, subirlos
        if (cloudUserUpserts.length > 0) {
          console.log(`[useCloudSync] Subiendo ${cloudUserUpserts.length} operadores más nuevos a la nube...`);
          const mappedUserUpserts = cloudUserUpserts.map(u => ({
            user_id: user.id,
            local_id: String(u.id),
            nombre: u.nombre,
            rol: u.rol,
            pin: u.pin,
            pin_hashed: u.pinHashed !== false,
            updated_at: u.updatedAt || u.updated_at || new Date().toISOString()
          }));

          const { error: upsertUsersError } = await supabase
            .from("pos_users")
            .upsert(mappedUserUpserts, { onConflict: "user_id,local_id" });

          if (upsertUsersError) {
            console.warn("[useCloudSync] Error subiendo operadores:", upsertUsersError.message);
          } else {
            recordsSynced += cloudUserUpserts.length;
          }
        }

        // Si hubo cambios locales o eliminaciones, guardar en Zustand y limpiar cola de eliminados
        if (usersUpdatedLocally) {
          setUsuariosFromSync(mergedUsers, true);
        }
      }

      // --- 3. REGISTRAR BITÁCORA DE SINCRONIZACIÓN EN LA NUBE (sync_log) ---
      await supabase.from("sync_log").insert({
        device_id: deviceId,
        user_id: user?.id || null,
        action: "full",
        status: "success",
        records_synced: recordsSynced,
      });

      // --- 4. SINCRONIZAR LOGS DE AUDITORÍA (Fase 5.6) ---
      try {
        const { syncAuditToCloud } = await import("../services/auditService");
        await syncAuditToCloud(deviceId);
      } catch (auditErr) {
        console.warn("[useCloudSync] Error sincronizando audit logs:", auditErr);
      }

      const nowStr = new Date().toISOString();
      setLastSyncTime(nowStr);
      localStorage.setItem("pda_last_sync_time", nowStr);
      setSyncStatus("success");

    } catch (err) {
      console.error("[useCloudSync] Error durante la sincronización:", err);
      setSyncError(err.message || String(err));
      setSyncStatus("error");

      // Registrar falla en sync_log
      try {
        await supabase.from("sync_log").insert({
          device_id: deviceId,
          user_id: user?.id || null,
          action: "full",
          status: "failed",
          records_synced: 0,
          error_message: err.message || String(err)
        });
      } catch (e) {
        console.error("[useCloudSync] No se pudo guardar sync_log fallido:", e);
      }
    }
  }, [isOnline, processQueue]);

  // Sincronización automática ante cambio de conexión o intervalo de 5 minutos
  useEffect(() => {
    if (isOnline) {
      // Esperar un momento a que se estabilice la conexión
      const timer = setTimeout(() => {
        sync();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, sync]);

  // Programar sync periódico cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && syncStatus !== "syncing") {
        sync();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isOnline, syncStatus, sync]);

  return {
    sync,
    syncStatus,
    lastSyncTime,
    syncError,
    pendingSalesCount: getPendingSalesCount(),
    addToQueue,
  };
}
