import { createClient } from "@supabase/supabase-js";

// Usamos el cliente secundario explícitamente ("precio al dia pagina")
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
