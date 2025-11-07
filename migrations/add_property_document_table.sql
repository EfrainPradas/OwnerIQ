-- =====================================================================
-- PROPERTY DOCUMENT TABLE
-- Tabla para almacenar documentos de propiedades con metadatos de AI
-- =====================================================================

-- Crear tabla property_document si no existe
CREATE TABLE IF NOT EXISTS property_document (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES property(property_id) ON DELETE CASCADE,

  -- Información del archivo
  document_type TEXT NOT NULL,  -- Ej: 'closing_alta', 'home_owner_insurance', 'tax_bill', etc.
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_path TEXT NOT NULL,       -- Ruta en Supabase Storage
  mime_type TEXT,
  description TEXT,

  -- Metadatos de AI (opcional, para batch processing)
  metadata JSONB,                -- Contiene: ai_document_id, classification_confidence, extracted_fields_count, validation_status, etc.

  -- Auditoría
  uploaded_by UUID,              -- Referencias a auth.users o person_id
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_property_document_property_id ON property_document(property_id);
CREATE INDEX IF NOT EXISTS idx_property_document_type ON property_document(document_type);
CREATE INDEX IF NOT EXISTS idx_property_document_upload_date ON property_document(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_property_document_uploaded_by ON property_document(uploaded_by);

-- Índice GIN para búsquedas en metadata JSONB
CREATE INDEX IF NOT EXISTS idx_property_document_metadata ON property_document USING GIN (metadata);

-- Comentarios para documentación
COMMENT ON TABLE property_document IS 'Documentos de propiedades con clasificación AI y extracción de datos';
COMMENT ON COLUMN property_document.document_type IS 'Tipo de documento clasificado por AI o manualmente';
COMMENT ON COLUMN property_document.metadata IS 'Metadatos de procesamiento AI: classification_confidence, extracted_fields_count, validation_status, etc.';
COMMENT ON COLUMN property_document.file_path IS 'Ruta en Supabase Storage bucket OwnerIQ';
