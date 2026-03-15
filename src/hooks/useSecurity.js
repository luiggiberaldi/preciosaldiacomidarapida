import { useState, useEffect, useCallback } from "react";
import { storageService } from "../utils/storageService";
import { supabase } from "../utils/supabase";

const APP_VERSION = "1.0.0";
const PRODUCT_ID = "comida_rapida";

// Storage keys namespaced by product to avoid cross-PWA contamination
const TOKEN_KEY = `pda_premium_token_${PRODUCT_ID}`;
const DEMO_FLAG_KEY = `pda_demo_flag_${PRODUCT_ID}`;
const SESSION_BACKUP_KEY = `_pda_s_${PRODUCT_ID}`;

const DEMO_DURATION_MS = 168 * 60 * 60 * 1000; // 168 horas (7 días)

// FIX 2: Ofuscación XOR + btoa para tokens en localStorage
const XOR_KEY = "PDA_SEC_2026";

const encodeToken = (str) => {
  try {
    const xored = str
      .split("")
      .map((c, i) =>
        String.fromCharCode(
          c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length),
        ),
      )
      .join("");
    return btoa(unescape(encodeURIComponent(xored)));
  } catch {
    return str;
  }
};

const decodeToken = (encoded) => {
  try {
    const xored = decodeURIComponent(escape(atob(encoded)));
    return xored
      .split("")
      .map((c, i) =>
        String.fromCharCode(
          c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length),
        ),
      )
      .join("");
  } catch {
    return encoded;
  }
};

export function useSecurity() {
  const [deviceId, setDeviceId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [demoExpires, setDemoExpires] = useState(null);
  const [demoExpiredMsg, setDemoExpiredMsg] = useState("");
  const [demoTimeLeft, setDemoTimeLeft] = useState("");
  // FIX 3: demoUsed como estado, leído desde IndexedDB
  const [demoUsed, setDemoUsed] = useState(false);

  // Calcular tiempo restante formateado
  const updateTimeLeft = useCallback((expiresAt) => {
    if (!expiresAt) {
      setDemoTimeLeft("");
      return;
    }
    const diff = expiresAt - Date.now();
    if (diff <= 0) {
      setDemoTimeLeft("");
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) setDemoTimeLeft(`${days}d ${hours}h`);
    else if (hours > 0) setDemoTimeLeft(`${hours}h ${mins}m`);
    else setDemoTimeLeft(`${mins}m`);
  }, []);

  useEffect(() => {
    // 1. Obtener o Generar Device ID a través de fingerprinting
    const generateFingerprint = async () => {
      const nav = window.navigator;
      const screen = window.screen;

      const components = [
        nav.userAgent,
        nav.language,
        nav.hardwareConcurrency || 1,
        nav.deviceMemory || 1,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
      ].join("|");

      // REMOVED local generateActivationCode

      if (!window.crypto || !window.crypto.subtle) {
        // Fallback (solo en http sin SSL)
        let hash = 0;
        for (let i = 0; i < components.length; i++) {
          hash = (hash << 5) - hash + components.charCodeAt(i);
          hash |= 0;
        }
        const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
        return `CRP-${hex}`;
      }

      // Mismo hardware = mismo hash SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(components);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
        .substring(0, 8);
      return `CRP-${hex}`;
    };

    const initDeviceId = async () => {
      let storedId = localStorage.getItem("pda_device_id");

      // Seamless Migration: PDA- to CRP-
      if (storedId && storedId.startsWith("PDA-")) {
        const newTempId = await generateFingerprint();
        if (newTempId.startsWith("CRP-")) {
          console.log(`[Migración] Actualizando ID de ${storedId} a ${newTempId}...`);
          // Si el ID antiguo tenía token premium/demo, regenerarlo
          const oldTokenRaw = localStorage.getItem(TOKEN_KEY);
          if (oldTokenRaw) {
            const decodedOld = decodeToken(oldTokenRaw);
            // Intenta parsear para ver si es demo o code directo
            let isDemoToken = false;
            let expTime = null;
            try {
              const obj = JSON.parse(decodedOld);
              if (obj.isDemo || obj.expires) {
                isDemoToken = true;
                expTime = obj.expires;
              }
            } catch (e) {
              // No es JSON, asumimos token permanente texto
            }

                        let newTokenRaw = 'MIGRATED-NO-SECRET';
            if (isDemoToken && expTime) {
              const tokenObj = { deviceId: newTempId, type: 'demo7', expires: expTime };
              newTokenRaw = JSON.stringify(tokenObj);
            } else {
              const tokenObj = { deviceId: newTempId, type: 'permanent' };
              newTokenRaw = JSON.stringify(tokenObj);
            }
            localStorage.setItem(TOKEN_KEY, encodeToken(newTokenRaw));

            const newValidCode = 'MIGRATED'; // Dummy code for update below

            // Intento 'best effort' de migrar en backend (Licencia y Demo)
            // No esperamos a que termine para no bloquear inicio off-line
            try {
              if (import.meta.env.VITE_SUPABASE_URL) {
                supabase.from("licenses").update({ device_id: newTempId, code: newValidCode }).eq("device_id", storedId).eq("product_id", PRODUCT_ID).then();
                supabase.from("demos").update({ device_id: newTempId }).eq("device_id", storedId).eq("product_id", PRODUCT_ID).then();
              }
            } catch (e) { }

            // Actualizar también el backup session (si existiese)
            try {
              sessionStorage.setItem(SESSION_BACKUP_KEY, encodeToken(newValidCode + ":" + newTempId));
            } catch (e) { }
          }

          localStorage.setItem("pda_device_id", newTempId);
          storedId = newTempId;
        }
      }

      if (!storedId) {
        storedId = await generateFingerprint();
        localStorage.setItem("pda_device_id", storedId);
      }

      // Migrate from old shared keys to namespaced keys (one-time)
      const oldToken = localStorage.getItem("pda_premium_token");
      if (oldToken && !localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(TOKEN_KEY, oldToken);
        localStorage.removeItem("pda_premium_token");
      }
      const oldSession = sessionStorage.getItem("_pda_s");
      if (oldSession && !sessionStorage.getItem(SESSION_BACKUP_KEY)) {
        sessionStorage.setItem(SESSION_BACKUP_KEY, oldSession);
        sessionStorage.removeItem("_pda_s");
      }

      setDeviceId(storedId);

      // Auto-registro: registrar dispositivo si no existe (sin importar licencia)
      try {
        if (import.meta.env.VITE_SUPABASE_URL) {
          const clientName = localStorage.getItem('business_name') || localStorage.getItem('restaurant_name') || '';
          await supabase.rpc('auto_register_device', { p_device_id: storedId, p_product_id: PRODUCT_ID, p_client_name: clientName });
        }
      } catch (e) { /* silencioso */ }

      checkLicense(storedId);
    };

    initDeviceId();

    // FIX 3: Leer demo flag desde IndexedDB
    storageService.getItem(DEMO_FLAG_KEY, null).then((r) => {
      if (r?.used) setDemoUsed(true);
    });
  }, []);

  // Heartbeat silencioso cada 4h + chequeo de revocación
  useEffect(() => {
    if (!isPremium || !deviceId || !import.meta.env.VITE_SUPABASE_URL) return;

    // Función de chequeo rápido de estado
    const verifyStatus = async () => {
      try {
        const { data: license, error } = await supabase
          .from("licenses")
          .select("type, active, expires_at")
          .eq("device_id", deviceId)
          .eq("product_id", PRODUCT_ID)
          .maybeSingle();

        if (license && license.active === false && isPremium) {
          // Revocado
          localStorage.removeItem(TOKEN_KEY);
          setIsPremium(false);
          setIsDemo(false);
          setDemoExpiredMsg(
            "Tu licencia ha sido desactivada. Contacta al administrador.",
          );
        } else if (license && license.active === true) {
          // Verificar si demo venció por fecha
          if (license.type === 'demo7' && license.expires_at) {
            const expiresAt = new Date(license.expires_at).getTime();
            if (Date.now() >= expiresAt && isPremium) {
              localStorage.removeItem(TOKEN_KEY);
              setIsPremium(false);
              setIsDemo(false);
              setDemoExpiredMsg(
                "Tu licencia temporal ha finalizado. Esperamos que hayas disfrutado la experiencia completa.",
              );
              return;
            }
          }

          // Si pasó a permanente en backend pero el estado local es demo -> recargar
          const rawStored = localStorage.getItem(TOKEN_KEY);
          let isDemoLocal = false;
          if (rawStored) {
            try {
              isDemoLocal = decodeToken(rawStored).includes('"isDemo":true');
            } catch (e) {
              isDemoLocal = rawStored.includes('"isDemo":true');
            }
          }

          const isMismatch =
            (license.type === "permanent" && isDemoLocal) ||
            (license.type === "demo7" && !isDemoLocal);

          if (isMismatch) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.reload();
          } else if (!isPremium) {
            // Reactivado remotamente -> Recargar para restaurar
            window.location.reload();
          }
        }
      } catch (e) { }
    };

    const sendHeartbeat = async () => {
      verifyStatus(); // Chequeo constante
      try {
        // Llamar a la Edge Function que captura la IP real del servidor
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-heartbeat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              device_id: deviceId,
              product_id: PRODUCT_ID,
              app_version: APP_VERSION,
            }),
          }
        );
      } catch (e) { }
    };

    // 1. Ejecutar heartbeat completo al montar y cada 4 horas
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 4 * 60 * 60 * 1000);

    // 2. Poll de estado cada 1 minuto para revocaciones rápidas
    const statusInterval = setInterval(verifyStatus, 60 * 1000);

    // 3. Revisar apenas el usuario regrese a la app
    const handleVisibility = () => {
      if (document.visibilityState === "visible") verifyStatus();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 4. Supabase Realtime (Si está habilitado en la tabla)
    let subscription = null;
    try {
      subscription = supabase
        .channel(`licenses_sync_${deviceId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "licenses",
            filter: `device_id=eq.${deviceId}`,
          },
          (payload) => {
            verifyStatus(); // Si hay un cambio, verificar inmediatamente
          },
        )
        .subscribe();
    } catch (e) { }

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(statusInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (subscription) subscription.unsubscribe();
    };
  }, [isPremium, deviceId]);

  // Heartbeat universal: actualizar last_seen_at sin importar tipo de licencia
  useEffect(() => {
    if (!deviceId || !import.meta.env.VITE_SUPABASE_URL) return;

    const universalPing = async () => {
      try {
        const clientName = localStorage.getItem('business_name') || localStorage.getItem('restaurant_name') || '';
        await supabase.rpc('heartbeat_device', { p_device_id: deviceId, p_product_id: PRODUCT_ID, p_client_name: clientName });
      } catch (e) { }
    };

    universalPing();
    const interval = setInterval(universalPing, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [deviceId]);

  // Countdown timer para demo
  useEffect(() => {
    if (!isDemo || !demoExpires) return;
    updateTimeLeft(demoExpires);
    const interval = setInterval(() => {
      const diff = demoExpires - Date.now();
      if (diff <= 0) {
        // Demo expiró en tiempo real
        clearInterval(interval);
        localStorage.removeItem(TOKEN_KEY);
        setIsPremium(false);
        setIsDemo(false);
        setDemoTimeLeft("");
        setDemoExpiredMsg(
          "Tu licencia temporal ha finalizado. Esperamos que hayas disfrutado la experiencia completa.",
        );
      } else {
        updateTimeLeft(demoExpires);
      }
    }, 60000); // Cada minuto
    return () => clearInterval(interval);
  }, [isDemo, demoExpires, updateTimeLeft]);

  // ----------------------------------------------------
  // INTEGRITY CHECK
  // ----------------------------------------------------
  useEffect(() => {
    if (!deviceId) return;
    const interval = setInterval(
      async () => {
        const raw = localStorage.getItem(TOKEN_KEY);

        if (!raw) {
          try {
            const backup = sessionStorage.getItem(SESSION_BACKUP_KEY);
            if (backup) {
              const decoded = decodeToken(backup);
              const [backupToken, backupDevice] = decoded.split(":");
              if (backupToken === "VALID_SESSION" && backupDevice === deviceId) {
                // Session is valid but local storage is gone. Let's force a reload to let checkLicense hit Supabase
                window.location.reload();
                return;
              }
            }
          } catch { }

          if (isPremium) {
            setIsPremium(false);
            setIsDemo(false);
            window.location.reload();
          }
          return;
        }

        if (raw) {
          const token = decodeToken(raw);
          let isValid = false;
          try {
            const obj = JSON.parse(token);
            isValid = obj?.deviceId === deviceId && (!obj.expires || Date.now() < obj.expires);
          } catch {
            isValid = false;
          }

          if (!isValid && isPremium) {
            localStorage.removeItem(TOKEN_KEY);
            setIsPremium(false);
            setIsDemo(false);
            window.location.reload();
          }
        }
      },
      30 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [deviceId, isPremium]);

  // REMOVED local generateActivationCode

  const checkLicense = async (currentDeviceId) => {
    // FIX 2: Decodificar token ofuscado
    const rawStored = localStorage.getItem(TOKEN_KEY);
    const storedToken = rawStored ? decodeToken(rawStored) : null;

    if (!storedToken) {
      // Fallback: verificar si existe licencia activa en Supabase (ej: reactivada remotamente)
      try {
        const { data: remoteLicense, error } = await supabase
          .from("licenses")
          .select("type, active, expires_at")
          .eq("device_id", currentDeviceId)
          .eq("product_id", PRODUCT_ID)
          .maybeSingle();

        if (remoteLicense && remoteLicense.active === true) {
          const validCode = await generateActivationCode(currentDeviceId);
          const isTimeLimited = remoteLicense.type === "demo7";
          const expiresAt = remoteLicense.expires_at
            ? new Date(remoteLicense.expires_at).getTime()
            : null;

          if (isTimeLimited && expiresAt) {
            if (Date.now() < expiresAt) {
              const token = {
                code: validCode,
                expires: expiresAt,
                isDemo: true,
              };
              localStorage.setItem(
                TOKEN_KEY,
                encodeToken(JSON.stringify(token)),
              );
              setIsPremium(true);
              setIsDemo(true);
              setDemoExpires(expiresAt);
            }
          } else {
            // Permanente — restaurar token ofuscado
            localStorage.setItem(TOKEN_KEY, encodeToken(validCode));
            setIsPremium(true);
            setIsDemo(false);
          }
          setLoading(false);
          return;
        }
      } catch (e) {
        // Sin red — no se puede restaurar
      }

      setIsPremium(false);
      setLoading(false);
      return;
    }

    let isPremiumConfirmed = false;
    let confirmedDemo = false;
    let confirmedExpires = null;

    try {
      const tokenObj = JSON.parse(storedToken);
      if (tokenObj && tokenObj.deviceId === currentDeviceId) {
        const isTimeLimited = tokenObj.type === "demo7" || tokenObj.isDemo; // retrocompatibilidad
        if (isTimeLimited) {
          if (Date.now() < tokenObj.expires) {
            setIsPremium(true);
            setIsDemo(true);
            setDemoExpires(tokenObj.expires);
            isPremiumConfirmed = true;
            confirmedDemo = true;
            confirmedExpires = tokenObj.expires;
          } else {
            console.warn("Demo Expirada");
            localStorage.removeItem(TOKEN_KEY);
            setIsPremium(false);
            setIsDemo(false);
            setDemoExpiredMsg(
              "Tu licencia temporal ha finalizado. Esperamos que hayas disfrutado la experiencia completa."
            );
          }
        } else {
          setIsPremium(true);
          setIsDemo(false);
          isPremiumConfirmed = true;
        }
      } else {
        setIsPremium(false);
      }
    } catch (e) {
      setIsPremium(false);
    }

    // FIX 5: Guardar backup en sessionStorage si licencia válida
    if (isPremiumConfirmed) {
      try {
        sessionStorage.setItem(
          SESSION_BACKUP_KEY,
          encodeToken("VALID_SESSION:" + currentDeviceId),
        );
      } catch { }
    }

    // Migración silenciosa de licencias pre-Supabase
    if (isPremiumConfirmed) {
      const migrateToSupabase = async () => {
        try {
          // Verificar si ya existe en Supabase
          const { data: existing } = await supabase
            .from("licenses")
            .select("id")
            .eq("device_id", currentDeviceId)
            .eq("product_id", PRODUCT_ID)
            .maybeSingle();

          // Si NO existe, registrarla ahora
          if (!existing) {
            await supabase.from("licenses").upsert({
              device_id: currentDeviceId,
              product_id: PRODUCT_ID,
              type: confirmedDemo ? "demo7" : "permanent",
              active: true,
              expires_at: confirmedExpires
                ? new Date(confirmedExpires).toISOString()
                : null,
              code: "MIGRADA-PRESUPABASE",
              last_seen_at: new Date().toISOString(),
            }, { onConflict: "device_id,product_id", ignoreDuplicates: true });
          } else {
            // Si ya existe, solo actualizar last_seen
            await supabase
              .from("licenses")
              .update({ last_seen_at: new Date().toISOString() })
              .eq("device_id", currentDeviceId)
              .eq("product_id", PRODUCT_ID);
          }
        } catch (e) {
          // Silencioso — nunca afecta la app
        }
      };

      migrateToSupabase(); // llamar sin await para no bloquear
    }

    setLoading(false);
  };

  /**
   * Activa la demo de 7 días sin necesidad de código.
   * Solo puede usarse UNA VEZ por dispositivo.
   */
  const activateDemo = async () => {
    // FIX 3: Verificar demo en IndexedDB (local)
    const demoRecord = await storageService.getItem(DEMO_FLAG_KEY, null);
    if (demoRecord?.used) {
      return { success: false, status: "DEMO_USED" };
    }

    const currentDeviceId = deviceId || localStorage.getItem("pda_device_id");

    // Verificar en servidor (por si borraron IndexedDB)
    try {
      const { data: existingDemo } = await supabase
        .from("licenses")
        .select("id, type")
        .eq("device_id", currentDeviceId)
        .eq("product_id", PRODUCT_ID)
        .neq("type", "registered")
        .maybeSingle();

      if (existingDemo) {
        await storageService.setItem(DEMO_FLAG_KEY, {
          used: true,
          ts: Date.now(),
          deviceId: currentDeviceId,
        });
        return { success: false, status: "DEMO_USED" };
      }
    } catch (e) {
      // Sin red → solo validar local
    }

    const expires = Date.now() + DEMO_DURATION_MS;
    const demoToken = {
      deviceId: currentDeviceId,
      type: "demo7",
      expires: expires,
    };

    // FIX 2: Guardar token ofuscado
    localStorage.setItem(
      TOKEN_KEY,
      encodeToken(JSON.stringify(demoToken)),
    );

    // FIX 3: Guardar flag en IndexedDB
    await storageService.setItem(DEMO_FLAG_KEY, {
      used: true,
      ts: Date.now(),
      deviceId: currentDeviceId,
    });

    setIsPremium(true);
    setIsDemo(true);
    setDemoExpires(expires);
    setDemoUsed(true);

    // Reportar demo a Supabase (silencioso)
    try {
      const expiresAt = new Date(expires).toISOString();

      // 1. Registrar en tabla demos
      await supabase.from("demos").upsert(
        {
          device_id: currentDeviceId,
          product_id: PRODUCT_ID,
          expires_at: expiresAt,
          app_version: APP_VERSION,
        },
        { onConflict: "device_id,product_id" },
      );

      // 2. Actualizar registro en licenses (upgrade de 'registered' a 'demo7')
      await supabase.from("licenses").upsert(
        {
          device_id: currentDeviceId,
          product_id: PRODUCT_ID,
          type: "demo7",
          active: true,
          code: "DEMO-ACTIVATED",
          expires_at: expiresAt,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "device_id,product_id" },
      );
    } catch (e) {
      // Nunca bloquear si falla la red
    }

    return { success: true, status: "DEMO_ACTIVATED" };
  };

  /**
   * Desbloquea con código de activación.
   * 1) Verifica contra Supabase (code + active) para cubrir códigos generados externamente.
   * 2) Si no hay red o no hay match en DB, valida localmente con SHA-256.
   */
  const unlockApp = async (inputCode) => {
    try {
      const cleanCode = (inputCode || "").trim();
      // FIX: Validar el código directamente contra la base de datos para ignorar fallos de Edge Functions
      const { data: license, error } = await supabase
        .from('licenses')
        .select('type, active, expires_at, code')
        .eq('device_id', deviceId)
        .eq('product_id', PRODUCT_ID)
        .maybeSingle();

      if (error || !license || license.code !== cleanCode) {
        return { success: false, status: 'INVALID_CODE' };
      }

      const { type, active, expires_at } = license;

      if (!active) {
        return { success: false, status: "LICENSE_REVOKED" };
      }

      const isTimeLimited = (type === "demo7");
      let expiresAt = expires_at ? new Date(expires_at).getTime() : null;

      if (isTimeLimited) {
        if (!expiresAt) {
          expiresAt = Date.now() + 168 * 60 * 60 * 1000;
          try {
            supabase.from("licenses").update({ expires_at: new Date(expiresAt).toISOString() })
              .eq("device_id", deviceId).eq("product_id", PRODUCT_ID).then();
          } catch (e) { }
        }

        const token = { deviceId, code: inputCode, type: "demo7", expires: expiresAt };
        localStorage.setItem(TOKEN_KEY, encodeToken(JSON.stringify(token)));
        setIsPremium(true);
        setIsDemo(true);
        setDemoExpires(expiresAt);
        return { success: true, status: "PREMIUM_ACTIVATED" };
      }

      // Permanente
      const token = { deviceId, code: inputCode, type: "permanent" };
      localStorage.setItem(TOKEN_KEY, encodeToken(JSON.stringify(token)));
      setIsPremium(true);
      setIsDemo(false);
      return { success: true, status: "PREMIUM_ACTIVATED" };
      
    } catch (err) {
      console.error("Error validating license:", err);
      return { success: false, status: "SERVER_ERROR" };
    }
  };

  /**
   * Ya no se generan códigos en cliente.
   */
  const generateCodeForClient = async () => null;

  return {
    deviceId,
    isPremium,
    loading,
    unlockApp,
    activateDemo,
    generateCodeForClient,
    isDemo,
    demoExpires,
    demoTimeLeft,
    demoExpiredMsg,
    dismissExpiredMsg: () => setDemoExpiredMsg(""),
    // FIX 3: demoUsed desde estado (IndexedDB)
    demoUsed,
  };
}
