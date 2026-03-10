import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";

// Cliente Principal (Data Local PWA)
const supaUrl = import.meta.env.VITE_SUPABASE_URL;
const supaAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supaUrl || !supaAnonKey) {
  throw new Error(
    "[POS] Faltan variables de entorno: VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supaUrl, supaAnonKey);

// Cliente Secundario (Pagina Web - Catalogo e Inbox)
const webSupaUrl = import.meta.env.VITE_WEB_SUPABASE_URL || "https://knhuctauzphtzigecjvx.supabase.co";
const webSupaAnonKey = import.meta.env.VITE_WEB_SUPABASE_ANON_KEY;

if (!webSupaAnonKey) {
  console.warn(
    "[POS] Falta VITE_WEB_SUPABASE_ANON_KEY. Las funciones de pedidos web no estaran disponibles."
  );
}

export const webSupabase = createClient(webSupaUrl, webSupaAnonKey || "dummy-key-web-disabled", {
  auth: { storageKey: "sb-web-pedidos-auth" },
});

// Multi-Tenant: ID del negocio actual
const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";
const PRODUCT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export const getTenantId = () => {
  try {
    const deviceId = localStorage.getItem("pda_device_id");
    if (!deviceId) return DEFAULT_TENANT;
    return uuidv5(deviceId, PRODUCT_NAMESPACE);
  } catch {
    return DEFAULT_TENANT;
  }
};

export const generateProductId = (tenantId, localId) => {
  return uuidv5(`${tenantId}-${localId}`, PRODUCT_NAMESPACE);
};
