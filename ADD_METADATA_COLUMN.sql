-- =====================================================================
-- AGREGAR CAMPO METADATA A PROPERTY_DOCUMENT
-- Ejecuta este SQL en Supabase SQL Editor
-- =====================================================================

-- 1. Agregar campo metadata
ALTER TABLE property_document ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Crear índice GIN para búsquedas rápidas en metadata
CREATE INDEX IF NOT EXISTS idx_property_document_metadata
ON property_document USING GIN (metadata);

-- 3. Agregar comentario
COMMENT ON COLUMN property_document.metadata IS 'AI processing metadata: classification_confidence, extracted_fields_count, validation_status, etc.';

-- 4. Verificar que se agregó correctamente
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'property_document'
ORDER BY ordinal_position;
