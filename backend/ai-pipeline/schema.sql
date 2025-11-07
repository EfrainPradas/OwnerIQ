-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA PIPELINE DE IA
-- Sistema de ingesta, clasificación y extracción de documentos inmobiliarios
-- ============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA PRINCIPAL: DOCUMENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  -- Identificación
  document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(property_id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Clasificación
  document_type VARCHAR(50) NOT NULL,
  classification_confidence DECIMAL(5,4) CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
  classification_reasoning TEXT,
  
  -- Archivo original
  filename VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) UNIQUE NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) DEFAULT 'application/pdf',
  
  -- Contenido
  raw_text TEXT,
  page_count INTEGER,
  
  -- Procesamiento
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ai_model VARCHAR(50),
  ai_tokens_used INTEGER DEFAULT 0,
  processing_duration_ms INTEGER,
  
  -- Extracción
  extraction_confidence DECIMAL(5,4) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Metadatos adicionales (JSON flexible)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT valid_document_type CHECK (document_type IN (
    'closing_alta',
    'first_payment_letter',
    'escrow_disclosure',
    'home_owner_insurance',
    'exhibit_a',
    'tax_bill',
    'lease_agreement',
    'mortgage_statement',
    'unknown'
  ))
);

-- Índices para documents
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_property ON documents(property_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_documents_uploaded ON documents(uploaded_at DESC);

-- ============================================================================
-- TABLA: PÁGINAS DE DOCUMENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_pages (
  page_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  
  page_number INTEGER NOT NULL,
  text TEXT,
  
  -- Metadatos de la página
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(document_id, page_number)
);

-- Índices para document_pages
CREATE INDEX idx_pages_document ON document_pages(document_id);
CREATE INDEX idx_pages_number ON document_pages(document_id, page_number);

-- ============================================================================
-- TABLA: CAMPOS EXTRAÍDOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS extracted_fields (
  field_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  page_id UUID REFERENCES document_pages(page_id) ON DELETE SET NULL,
  
  -- Campo
  field_name VARCHAR(100) NOT NULL,
  field_value TEXT,
  normalized_value JSONB,
  
  -- Confianza y trazabilidad
  confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  source_text TEXT,
  source_page_number INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para extracted_fields
CREATE INDEX idx_fields_document ON extracted_fields(document_id);
CREATE INDEX idx_fields_name ON extracted_fields(field_name);
CREATE INDEX idx_fields_confidence ON extracted_fields(confidence);

-- ============================================================================
-- TABLA: VALIDACIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_validations (
  validation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  
  validation_type VARCHAR(20) NOT NULL,
  severity VARCHAR(10) NOT NULL,
  field_name VARCHAR(100),
  message TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_validation_type CHECK (validation_type IN ('error', 'warning', 'info')),
  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low'))
);

-- Índices para document_validations
CREATE INDEX idx_validations_document ON document_validations(document_id);
CREATE INDEX idx_validations_type ON document_validations(validation_type);

-- ============================================================================
-- TABLA: LOGS DE PROCESAMIENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS processing_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  message TEXT,
  
  -- Datos adicionales
  data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_stage CHECK (stage IN (
    'ingestion', 'classification', 'extraction', 'validation', 'persistence'
  )),
  CONSTRAINT valid_log_status CHECK (status IN ('started', 'completed', 'failed'))
);

-- Índices para processing_logs
CREATE INDEX idx_logs_document ON processing_logs(document_id);
CREATE INDEX idx_logs_stage ON processing_logs(stage);
CREATE INDEX idx_logs_created ON processing_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para documents
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para document_pages (heredan de documents)
CREATE POLICY "Users can view pages of their documents"
  ON document_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.document_id = document_pages.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Políticas para extracted_fields (heredan de documents)
CREATE POLICY "Users can view fields of their documents"
  ON extracted_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.document_id = extracted_fields.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Políticas para document_validations (heredan de documents)
CREATE POLICY "Users can view validations of their documents"
  ON document_validations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.document_id = document_validations.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Políticas para processing_logs (heredan de documents)
CREATE POLICY "Users can view logs of their documents"
  ON processing_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.document_id = processing_logs.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCIONES ÚTILES
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para extracted_fields
CREATE TRIGGER update_extracted_fields_updated_at
  BEFORE UPDATE ON extracted_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para obtener estadísticas de documentos
CREATE OR REPLACE FUNCTION get_document_stats(p_user_id UUID)
RETURNS TABLE (
  total_documents BIGINT,
  by_type JSONB,
  by_status JSONB,
  avg_confidence DECIMAL,
  total_tokens_used BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_documents,
    jsonb_object_agg(document_type, type_count) as by_type,
    jsonb_object_agg(status, status_count) as by_status,
    AVG(classification_confidence) as avg_confidence,
    SUM(ai_tokens_used)::BIGINT as total_tokens_used
  FROM (
    SELECT
      document_type,
      status,
      classification_confidence,
      ai_tokens_used,
      COUNT(*) OVER (PARTITION BY document_type) as type_count,
      COUNT(*) OVER (PARTITION BY status) as status_count
    FROM documents
    WHERE user_id = p_user_id
  ) subq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE documents IS 'Documentos procesados por el pipeline de IA';
COMMENT ON TABLE document_pages IS 'Páginas individuales de cada documento';
COMMENT ON TABLE extracted_fields IS 'Campos extraídos con trazabilidad y confianza';
COMMENT ON TABLE document_validations IS 'Errores y advertencias de validación';
COMMENT ON TABLE processing_logs IS 'Logs detallados del procesamiento';

COMMENT ON COLUMN documents.file_hash IS 'Hash MD5 del archivo para detectar duplicados';
COMMENT ON COLUMN documents.classification_confidence IS 'Confianza de la clasificación (0.0 a 1.0)';
COMMENT ON COLUMN extracted_fields.confidence IS 'Confianza de la extracción del campo (0.0 a 1.0)';
COMMENT ON COLUMN extracted_fields.source_text IS 'Texto original del documento donde se encontró el valor';