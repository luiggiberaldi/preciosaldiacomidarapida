import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asihxlvhphbjdirwiygp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaWh4bHZocGhiamRpcndpeWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTMwMTAsImV4cCI6MjA5NTk4OTAxMH0.3x3ZJhnSk3IS9WxnaLeq5YMfb4ydDq9aB1ZjcuePUXM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('licenses')
    .select('id, code')
    .limit(1);
    
  console.log('Anon Key Query:', data, error);
}

check();
