-- =====================================================================
-- COMPLETE PROPERTY DOCUMENTS SETUP
-- Run this entire script in Supabase SQL Editor
-- =====================================================================

-- Step 1: Create the document_type enum
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

-- Step 2: Create the property_document table
CREATE TABLE IF NOT EXISTS property_document (
  document_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  document_type     document_type NOT NULL DEFAULT 'other',
  file_name         TEXT NOT NULL,
  file_size_bytes   BIGINT,
  file_path         TEXT NOT NULL,
  mime_type         TEXT,
  description       TEXT,
  uploaded_by       UUID,
  upload_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_uploaded_by FOREIGN KEY (uploaded_by) 
    REFERENCES person(person_id) ON DELETE SET NULL
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_property_document_property 
  ON property_document(property_id);
  
CREATE INDEX IF NOT EXISTS idx_property_document_type 
  ON property_document(document_type);
  
CREATE INDEX IF NOT EXISTS idx_property_document_upload_date 
  ON property_document(upload_date DESC);

-- Step 4: Enable Row Level Security
ALTER TABLE property_document ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their property documents" ON property_document;
DROP POLICY IF EXISTS "Users can insert property documents" ON property_document;
DROP POLICY IF EXISTS "Users can delete property documents" ON property_document;
DROP POLICY IF EXISTS "Users can update property documents" ON property_document;

-- Step 6: Create RLS policies for property_document table
CREATE POLICY "Users can view their property documents"
ON property_document FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT property_id 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

CREATE POLICY "Users can insert property documents"
ON property_document FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT property_id 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

CREATE POLICY "Users can delete property documents"
ON property_document FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT property_id 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

CREATE POLICY "Users can update property documents"
ON property_document FOR UPDATE
TO authenticated
USING (
  property_id IN (
    SELECT property_id 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

-- Step 7: Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload property documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their property documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their property documents" ON storage.objects;

-- Step 8: Create RLS policies for Supabase Storage (OwnerIQ bucket)
CREATE POLICY "Users can upload property documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents' AND
  (storage.foldername(name))[2] IN (
    SELECT property_id::text 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

CREATE POLICY "Users can view their property documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents' AND
  (storage.foldername(name))[2] IN (
    SELECT property_id::text 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their property documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents' AND
  (storage.foldername(name))[2] IN (
    SELECT property_id::text 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

-- Step 9: Add helpful comments
COMMENT ON TABLE property_document IS 'Stores metadata for property-related documents. Files are stored in Supabase Storage at OwnerIQ/property-documents/{property_id}/';
COMMENT ON COLUMN property_document.file_path IS 'Path to file in Supabase Storage (e.g., property-documents/property-id/filename.pdf)';

-- Done! The property documents feature is now fully configured.
SELECT 'Property documents setup completed successfully!' as status;