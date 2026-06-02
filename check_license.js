import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asihxlvhphbjdirwiygp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaWh4bHZocGhiamRpcndpeWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTMwMTAsImV4cCI6MjA5NTk4OTAxMH0.3x3ZJhnSk3IS9WxnaLeq5YMfb4ydDq9aB1ZjcuePUXM';
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
