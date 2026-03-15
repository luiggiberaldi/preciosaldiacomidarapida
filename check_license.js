import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjbzevntreoxpuofgkyi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnpldm50cmVveHB1b2Zna3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjE4MDIsImV4cCI6MjA4NzAzNzgwMn0.wyyISEMsTEl__QgeckSVWgX1isif8iZOblO8GNso-TQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('device_id', 'CRP-576AB0E3')
    .eq('product_id', 'comida_rapida');
    
  if (error) console.error('Error:', error);
  else console.log('Licenses Length:', data.length, data);
  
  const single = await supabase
    .from('licenses')
    .select('*')
    .eq('device_id', 'CRP-576AB0E3')
    .eq('product_id', 'comida_rapida')
    .maybeSingle();
    
    console.log('maybeSingle:', single);
}

check();
