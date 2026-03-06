import { createClient } from "@supabase/supabase-js";

// Cliente Principal (Data Local PWA) — jjbzevntreoxpuofgkyi (NO TOCAR)
const supaUrl = import.meta.env.VITE_SUPABASE_URL;
const supaAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supaUrl, supaAnonKey);

// Cliente Secundario (Página Web - Catálogo e Inbox | knhuctauzphtzigecjvx)
const webSupaUrl = "https://knhuctauzphtzigecjvx.supabase.co";
const webSupaAnonKey = import.meta.env.VITE_WEB_SUPABASE_ANON_KEY;

export const webSupabase = createClient(webSupaUrl, webSupaAnonKey, {
  auth: { storageKey: "sb-web-pedidos-auth" },
});

// Multi-Tenant: ID del negocio actual (se asigna al activar licencia)
const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";
export const getTenantId = () =>
  localStorage.getItem("tenant_id") || DEFAULT_TENANT;

