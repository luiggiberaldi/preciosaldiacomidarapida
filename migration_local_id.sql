-- ============================================
-- MIGRACIÓN 2: Agregar local_id a web_catalog
-- Proyecto: knhuctauzphtzigecjvx
-- ============================================

ALTER TABLE web_catalog ADD COLUMN IF NOT EXISTS local_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_catalog_local_id ON web_catalog(tenant_id, local_id);
