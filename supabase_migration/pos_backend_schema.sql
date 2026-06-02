-- ========================================================
-- SCRIPT DE MIGRACIÓN: Sistema Principal de Licencias (POS)
-- Aplicar en el nuevo proyecto de Supabase para el POS/Backend
-- ========================================================

-- 1. Crear tabla de licencias
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID DEFAULT gen_random_uuid() UNIQUE,
    device_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'registered', -- 'registered', 'demo7', 'permanent', 'revoked'
    active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    code TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    client_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (device_id, product_id)
);

-- 2. Crear tabla de demos
CREATE TABLE IF NOT EXISTS public.demos (
    device_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (device_id, product_id)
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para acceso anónimo (Anon Key)
DROP POLICY IF EXISTS "Allow public read access to licenses" ON public.licenses;
CREATE POLICY "Allow public read access to licenses" ON public.licenses 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to licenses" ON public.licenses;
CREATE POLICY "Allow public insert to licenses" ON public.licenses 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to licenses" ON public.licenses;
CREATE POLICY "Allow public update to licenses" ON public.licenses 
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to demos" ON public.demos;
CREATE POLICY "Allow public read access to demos" ON public.demos 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to demos" ON public.demos;
CREATE POLICY "Allow public insert to demos" ON public.demos 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to demos" ON public.demos;
CREATE POLICY "Allow public update to demos" ON public.demos 
    FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Crear función RPC: auto_register_device
CREATE OR REPLACE FUNCTION public.auto_register_device(
  p_device_id TEXT,
  p_product_id TEXT,
  p_client_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador (bypass RLS)
AS $$
BEGIN
  INSERT INTO public.licenses (device_id, product_id, client_name, type, active, last_seen_at)
  VALUES (p_device_id, p_product_id, p_client_name, 'registered', true, now())
  ON CONFLICT (device_id, product_id)
  DO UPDATE SET 
    client_name = CASE WHEN p_client_name <> '' THEN p_client_name ELSE public.licenses.client_name END,
    last_seen_at = now();
END;
$$;

-- 6. Crear función RPC: heartbeat_device
CREATE OR REPLACE FUNCTION public.heartbeat_device(
  p_device_id TEXT,
  p_product_id TEXT,
  p_client_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.licenses (device_id, product_id, client_name, type, active, last_seen_at)
  VALUES (p_device_id, p_product_id, p_client_name, 'registered', true, now())
  ON CONFLICT (device_id, product_id)
  DO UPDATE SET 
    client_name = CASE WHEN p_client_name <> '' THEN p_client_name ELSE public.licenses.client_name END,
    last_seen_at = now();
END;
$$;
