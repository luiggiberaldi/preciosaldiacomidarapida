import { useState, useEffect, useCallback } from "react";
import { storageService } from "../utils/storageService";
import { supabase } from "../utils/supabase";

const APP_VERSION = "1.0.0";
const PRODUCT_ID = "comida_rapida";

// Storage keys namespaced by product to avoid cross-PWA contamination
const TOKEN_KEY = `pda_premium_token_${PRODUCT_ID}`;
const DEMO_FLAG_KEY = `pda_demo_flag_${PRODUCT_ID}`;
const SESSION_BACKUP_KEY = `_pda_s_${PRODUCT_ID}`;

// FIX 1: Salt desde variable de entorno
const MASTER_SECRET_KEY = import.meta.env.VITE_LICENSE_SALT;
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

      const generateActivationCode = async (devId) => {
        if (!window.crypto || !window.crypto.subtle) {
          let hash = 5381;
          const str = devId + MASTER_SECRET_KEY;
          for (let i = 0; i < str.length; i++) { hash = (hash << 5) + hash + str.charCodeAt(i); }
          const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
          return `ACTIV-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
        }
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(devId + MASTER_SECRET_KEY));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
        return `ACTIV-${hashHex.substring(0, 4)}-${hashHex.substring(4, 8)}`;
      };

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

            const newValidCode = await generateActivationCode(newTempId);
            let newTokenRaw = newValidCode;
            if (isDemoToken && expTime) {
              const tokenObj = { code: newValidCode, expires: expTime, isDemo: true };
              newTokenRaw = JSON.stringify(tokenObj);
            }
            localStorage.setItem(TOKEN_KEY, encodeToken(newTokenRaw));

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

  // FIX 4: Integrity check periódico cada 30 minutos
  useEffect(() => {
    if (!deviceId) return;
    const interval = setInterval(
      async () => {
        const raw = localStorage.getItem(TOKEN_KEY);

        // FIX 5: Si localStorage fue borrado, intentar restaurar desde sessionStorage
        if (!raw) {
          try {
            const backup = sessionStorage.getItem(SESSION_BACKUP_KEY);
            if (backup) {
              const decoded = decodeToken(backup);
              const [backupToken, backupDevice] = decoded.split(":");
              const validCode = await generateActivationCode(deviceId);
              if (backupToken === validCode && backupDevice === deviceId) {
                // Restaurar token silenciosamente
                localStorage.setItem(
                  TOKEN_KEY,
                  encodeToken(validCode),
                );
                return; // No hacer reload, licencia restaurada
              }
            }
          } catch { }
          // Si no hay backup válido y estaba premium → revocar
          if (isPremium) {
            setIsPremium(false);
            setIsDemo(false);
            window.location.reload();
          }
          return;
        }

        // Verificar integridad del token almacenado
        if (raw) {
          const token = decodeToken(raw);
          const validCode = await generateActivationCode(deviceId);
          let isValid = false;
          try {
            const obj = JSON.parse(token);
            isValid = obj?.code === validCode && Date.now() < obj.expires;
          } catch {
            isValid = token === validCode;
          }

          // Si el token local ya venció o fue alterado
          if (!isValid && isPremium) {
            localStorage.removeItem(TOKEN_KEY);
            setIsPremium(false);
            setIsDemo(false);
            window.location.reload();
          }
        }
      },
      30 * 60 * 1000,
    ); // 30 minutos

    return () => clearInterval(interval);
  }, [deviceId, isPremium]);

  // Refactored generateActivationCode to be reusable outside of the hook natively without reliance on state
  const _generateActivationCode = async (devId) => {
    if (!window.crypto || !window.crypto.subtle) {
      console.warn("⚠️ Crypto API no disponible. Usando fallback.");
      let hash = 5381;
      const str = devId + MASTER_SECRET_KEY;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) + hash + str.charCodeAt(i);
      }
      const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
      return `ACTIV-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(devId + MASTER_SECRET_KEY);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    return `ACTIV-${hashHex.substring(0, 4)}-${hashHex.substring(4, 8)}`;
  };

  const generateActivationCode = _generateActivationCode;

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

    const validTokenStr = await generateActivationCode(currentDeviceId);
    let isPremiumConfirmed = false;
    let confirmedDemo = false;
    let confirmedExpires = null;

    try {
      const tokenObj = JSON.parse(storedToken);
      if (tokenObj && tokenObj.code && tokenObj.expires) {
        if (tokenObj.code === validTokenStr) {
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
              "Tu licencia temporal ha finalizado. Esperamos que hayas disfrutado la experiencia completa.",
            );
          }
        } else {
          setIsPremium(false);
        }
      } else {
        setIsPremium(false);
      }
    } catch (e) {
      // Formato string antiguo (Lifetime License)
      if (storedToken === validTokenStr) {
        setIsPremium(true);
        setIsDemo(false);
        isPremiumConfirmed = true;
        confirmedDemo = false;
      } else {
        setIsPremium(false);
      }
    }

    // FIX 5: Guardar backup en sessionStorage si licencia válida
    if (isPremiumConfirmed) {
      try {
        sessionStorage.setItem(
          SESSION_BACKUP_KEY,
          encodeToken(validTokenStr + ":" + currentDeviceId),
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
        .select("id")
        .eq("device_id", currentDeviceId)
        .eq("product_id", PRODUCT_ID)
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

    const validCode = await generateActivationCode(currentDeviceId);
    const expires = Date.now() + DEMO_DURATION_MS;
    const demoToken = {
      code: validCode,
      expires: expires,
      isDemo: true,
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

      await supabase.from("demos").upsert(
        {
          device_id: currentDeviceId,
          product_id: PRODUCT_ID,
          expires_at: expiresAt,
          app_version: APP_VERSION,
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
    const trimmedCode = inputCode.trim().toUpperCase();
    const localValidCode = await generateActivationCode(deviceId);

    // ── 1. Intentar validar contra Supabase (fuente de verdad) ──
    let licenseType = "permanent";
    let expiresAt = null;
    let lastSeenAt = null;
    let supabaseMatch = false;

    try {
      const { data } = await supabase
        .from("licenses")
        .select("type, expires_at, last_seen_at, code, active")
        .eq("device_id", deviceId)
        .eq("product_id", PRODUCT_ID)
        .maybeSingle();

      if (data && data.active && data.code === trimmedCode) {
        supabaseMatch = true;
        if (data.type) licenseType = data.type;
        if (data.expires_at) expiresAt = new Date(data.expires_at).getTime();
        if (data.last_seen_at) lastSeenAt = data.last_seen_at;
      }
    } catch (e) {
      // Sin red → caer al chequeo local
    }

    // ── 2. Validación local (fallback si no hay red o no hay match en DB) ──
    if (!supabaseMatch) {
      if (trimmedCode !== localValidCode) {
        return { success: false, status: "INVALID_CODE" };
      }
    }

    // ── 3. Activar según tipo ──
    const codeToStore = supabaseMatch ? localValidCode : trimmedCode;
    const isTimeLimited = licenseType === "demo7";

    if (isTimeLimited) {
      let finalExpiresAt = expiresAt;
      if (!lastSeenAt) {
        finalExpiresAt = Date.now() + 168 * 60 * 60 * 1000;
        try {
          supabase
            .from("licenses")
            .update({ expires_at: new Date(finalExpiresAt).toISOString() })
            .eq("device_id", deviceId)
            .eq("product_id", PRODUCT_ID)
            .then();
        } catch (e) { }
      }

      if (finalExpiresAt) {
        expiresAt = finalExpiresAt;
        const token = { code: codeToStore, expires: expiresAt, isDemo: true };
        localStorage.setItem(
          TOKEN_KEY,
          encodeToken(JSON.stringify(token)),
        );
        setIsPremium(true);
        setIsDemo(true);
        setDemoExpires(expiresAt);
        return { success: true, status: "PREMIUM_ACTIVATED" };
      }
    }

    // Permanente
    localStorage.setItem(TOKEN_KEY, encodeToken(codeToStore));
    setIsPremium(true);
    setIsDemo(false);
    return { success: true, status: "PREMIUM_ACTIVATED" };
  };

  /**
   * Solo para el panel de admin: Genera el código para un CLIENTE (otro ID)
   */
  const generateCodeForClient = async (clientDeviceId) => {
    return await generateActivationCode(clientDeviceId);
  };

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
