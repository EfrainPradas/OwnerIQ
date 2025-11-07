-- =====================================================================
-- PROPERTY DOCUMENTS TABLE
-- =====================================================================
-- This table stores metadata for documents related to properties
-- Actual files are stored in Supabase Storage bucket

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'purchase_agreement',
    'closing_documents',
    'title_deed',
    'inspection_report',
    'appraisal',
    'insurance_policy',
    'tax_documents',
    'lease_agreement',
    'maintenance_records',
    'warranty',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS property_document (
  document_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  document_type     document_type NOT NULL DEFAULT 'other',
  file_name         TEXT NOT NULL,
  file_size_bytes   BIGINT,
  file_path         TEXT NOT NULL,  -- Path in Supabase Storage
  mime_type         TEXT,
  description       TEXT,
  uploaded_by       UUID,  -- person_id who uploaded
  upload_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Index for faster queries
  CONSTRAINT fk_uploaded_by FOREIGN KEY (uploaded_by) 
    REFERENCES person(person_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_document_property 
  ON property_document(property_id);
  
CREATE INDEX IF NOT EXISTS idx_property_document_type 
  ON property_document(document_type);
  
CREATE INDEX IF NOT EXISTS idx_property_document_upload_date 
  ON property_document(upload_date DESC);

-- Add comment for documentation
COMMENT ON TABLE property_document IS 'Stores metadata for property-related documents. Files are stored in Supabase Storage.';
COMMENT ON COLUMN property_document.file_path IS 'Path to file in Supabase Storage bucket (e.g., property-documents/property-id/filename.pdf)';