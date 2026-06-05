-- Migración SQL: Sincronización de Mesas Activas / Consumos en Salón
-- Aplicar en el editor SQL de Supabase para habilitar sincronización en tiempo real.

CREATE TABLE IF NOT EXISTS public.pos_active_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_id TEXT NOT NULL,
    name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' o 'CHECKOUT' (Pre-cuenta solicitada)
    customer_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_pos_active_tabs UNIQUE (user_id, table_id)
);

COMMENT ON TABLE public.pos_active_tabs IS 'Mesas de salón activas y sus consumos sincronizados en tiempo real por local';

-- 1. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.pos_active_tabs ENABLE ROW LEVEL SECURITY;

-- 2. Crear Políticas de Seguridad
DROP POLICY IF EXISTS "Tenant manages own active tabs" ON public.pos_active_tabs;

CREATE POLICY "Tenant manages own active tabs"
    ON public.pos_active_tabs FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 3. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_pos_active_tabs_tenant ON public.pos_active_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_active_tabs_tenant_table ON public.pos_active_tabs(user_id, table_id);
