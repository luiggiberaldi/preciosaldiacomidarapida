import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjbzevntreoxpuofgkyi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnpldm50cmVveHB1b2Zna3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjE4MDIsImV4cCI6MjA4NzAzNzgwMn0.wyyISEMsTEl__QgeckSVWgX1isif8iZOblO8GNso-TQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('licenses')
    .select('id, code')
    .limit(1);
    
  console.log('Anon Key Query:', data, error);
}

check();
