-- Add requires_prepayment column to web_config table
ALTER TABLE web_config 
ADD COLUMN requires_prepayment BOOLEAN DEFAULT false;

-- Notify Supabase PostgREST to reload the schema cache so the API recognizes the new column immediately
NOTIFY pgrst, 'reload schema';
