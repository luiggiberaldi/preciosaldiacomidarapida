-- Migración SQL: Soporte de Sincronización y Roles de Usuario (Fase 5)
-- Repositorio: comida rapida (precios al dia)

-- 1. Habilitar extensión uuid-ossp si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear Tabla de Roles de Usuario
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'employee' CONSTRAINT chk_role CHECK (role IN ('admin', 'employee', 'kitchen')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_user_role UNIQUE (user_id)
);

-- Comentario explicativo
COMMENT ON TABLE public.user_roles IS 'Roles de seguridad y acceso para los usuarios de la plataforma';

-- 3. Crear Tabla de Bitácora de Sincronización
CREATE TABLE IF NOT EXISTS public.sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CONSTRAINT chk_sync_action CHECK (action IN ('pull', 'push', 'full')),
    status TEXT NOT NULL CONSTRAINT chk_sync_status CHECK (status IN ('success', 'failed')),
    records_synced INTEGER DEFAULT 0 NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.sync_log IS 'Historial de sincronización bidireccional offline/online por dispositivo';

-- 4. Crear Tabla de Auditoría en la Nube
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID,
    action TEXT NOT NULL,
    details TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.audit_log IS 'Bitácora universal de auditoría inmutable sincronizada desde los dispositivos';

-- 5. Crear Función Helper para obtener el Rol del Usuario
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Habilitar Seguridad a Nivel de Fila (RLS) en todas las tablas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 7. Crear Políticas de Seguridad RLS

-- Políticas para user_roles
CREATE POLICY "Permitir lectura de rol propio" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.get_user_role() = 'admin');

CREATE POLICY "Administradores controlan todos los roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- Políticas para sync_log
CREATE POLICY "Permitir a usuarios registrar syncs" ON public.sync_log
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir a usuarios leer sus propios logs de sync" ON public.sync_log
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.get_user_role() = 'admin');

CREATE POLICY "Administradores gestionan todos los logs de sync" ON public.sync_log
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin');

-- Políticas para audit_log
CREATE POLICY "Permitir a usuarios insertar auditoria" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Cualquier usuario autenticado puede reportar logs de auditoría

CREATE POLICY "Permitir lectura de auditoria solo a administradores" ON public.audit_log
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'admin');

CREATE POLICY "Administradores controlan toda la tabla de auditoria" ON public.audit_log
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin');

-- Trigger para mantener actualizado updated_at en user_roles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
