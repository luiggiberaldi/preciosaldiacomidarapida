-- Migración SQL: Sincronización de Operadores/Usuarios Locales
-- Aplicar en el editor SQL de Supabase para habilitar la sincronización de PINs de operadores.

CREATE TABLE IF NOT EXISTS public.pos_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    local_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL,
    pin TEXT NOT NULL,
    pin_hashed BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_pos_users_tenant_local UNIQUE (user_id, local_id)
);

COMMENT ON TABLE public.pos_users IS 'Operadores y cajeros del punto de venta locales sincronizados por tenant/cuenta';

-- 1. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;

-- 2. Crear Políticas de Seguridad
DROP POLICY IF EXISTS "User can manage own POS users" ON public.pos_users;

CREATE POLICY "User can manage own POS users"
    ON public.pos_users FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 3. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_pos_users_tenant ON public.pos_users(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_tenant_local ON public.pos_users(user_id, local_id);
