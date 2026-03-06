import { createClient } from "@supabase/supabase-js";

// Estas variables deben venir del entorno (.env)
// Idealmente: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cliente Singleton
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
