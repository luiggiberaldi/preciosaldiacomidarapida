-- ========================================================
-- SCRIPT DE MIGRACIÓN: Web de Pedidos (web-cliente)
-- Aplicar en el nuevo proyecto de Supabase para la Web de Pedidos
-- ========================================================

-- 1. Crear tabla web_config
CREATE TABLE IF NOT EXISTS public.web_config (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT DEFAULT 'Mi Negocio',
    slug TEXT UNIQUE NOT NULL,
    is_open BOOLEAN DEFAULT true,
    whatsapp_number TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    has_delivery BOOLEAN DEFAULT true,
    requires_prepayment BOOLEAN DEFAULT false,
    exchange_rate NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear tabla web_catalog
CREATE TABLE IF NOT EXISTS public.web_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id BIGINT,
    tenant_id UUID NOT NULL REFERENCES public.web_config(tenant_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_usd NUMERIC NOT NULL DEFAULT 0.0,
    category TEXT DEFAULT 'otros',
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    prep_time TEXT DEFAULT '10',
    sizes JSONB DEFAULT '[]'::jsonb,
    extras JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear tabla web_orders
CREATE TABLE IF NOT EXISTS public.web_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.web_config(tenant_id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_notes TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_usd NUMERIC NOT NULL DEFAULT 0.0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_config_slug ON public.web_config(slug);
CREATE INDEX IF NOT EXISTS idx_catalog_tenant ON public.web_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_catalog_local_id ON public.web_catalog(tenant_id, local_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.web_orders(tenant_id);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE public.web_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_orders ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS para acceso público/anónimo
DROP POLICY IF EXISTS "anon_read_config" ON public.web_config;
CREATE POLICY "anon_read_config" ON public.web_config 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_write_config" ON public.web_config;
CREATE POLICY "anon_write_config" ON public.web_config 
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_catalog" ON public.web_catalog;
CREATE POLICY "anon_read_catalog" ON public.web_catalog 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_write_catalog" ON public.web_catalog;
CREATE POLICY "anon_write_catalog" ON public.web_catalog 
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_orders" ON public.web_orders;
CREATE POLICY "anon_read_orders" ON public.web_orders 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON public.web_orders;
CREATE POLICY "anon_insert_orders" ON public.web_orders 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON public.web_orders;
CREATE POLICY "anon_update_orders" ON public.web_orders 
    FOR UPDATE USING (true) WITH CHECK (true);

-- 7. Insertar tenant por defecto para pruebas/inicialización
INSERT INTO public.web_config (tenant_id, business_name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Negocio Demo', 'demo')
ON CONFLICT (tenant_id) DO NOTHING;
