-- ============================================
-- MIGRACIÓN: Multi-Tenant para Comida Rápida
-- Proyecto: knhuctauzphtzigecjvx
-- ============================================

-- 1. Borrar tabla web_config vieja (tenía otra estructura)
DROP TABLE IF EXISTS web_config;

-- 2. Crear tabla web_config con estructura multi-tenant
CREATE TABLE web_config (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT DEFAULT 'Mi Negocio',
  slug TEXT UNIQUE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  whatsapp_number TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Agregar columna tenant_id a tablas existentes
ALTER TABLE web_catalog ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE web_orders  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 4. Crear tenant por defecto y asociar datos existentes
INSERT INTO web_config (tenant_id, business_name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Negocio Demo', 'demo');

UPDATE web_catalog SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE web_orders  SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- 5. Hacer tenant_id NOT NULL
ALTER TABLE web_catalog ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE web_orders  ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_catalog_tenant ON web_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant  ON web_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_config_slug    ON web_config(slug);

-- 7. RLS
ALTER TABLE web_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_config  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_catalog"  ON web_catalog FOR SELECT USING (true);
CREATE POLICY "anon_write_catalog" ON web_catalog FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_orders"   ON web_orders FOR SELECT USING (true);
CREATE POLICY "anon_insert_orders" ON web_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_orders" ON web_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_config"   ON web_config FOR SELECT USING (true);
CREATE POLICY "anon_write_config"  ON web_config FOR ALL    USING (true) WITH CHECK (true);
