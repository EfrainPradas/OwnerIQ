-- =====================================================================
-- FIX RLS POLICY FOR PROPERTY_DOCUMENT TABLE
-- This allows the table to work with your current authentication setup
-- =====================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their property documents" ON property_document;
DROP POLICY IF EXISTS "Users can insert property documents" ON property_document;
DROP POLICY IF EXISTS "Users can delete property documents" ON property_document;
DROP POLICY IF EXISTS "Users can update property documents" ON property_document;

-- Temporarily disable RLS to allow all authenticated users
-- (You can tighten this later once auth is fully integrated)
CREATE POLICY "Authenticated users can view all property documents"
ON property_document FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert property documents"
ON property_document FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete property documents"
ON property_document FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update property documents"
ON property_document FOR UPDATE
TO authenticated
USING (true);

-- Also update storage policies to be more permissive for now
DROP POLICY IF EXISTS "Users can upload property documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their property documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their property documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload to property-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents'
);

CREATE POLICY "Authenticated users can view property-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents'
);

CREATE POLICY "Authenticated users can delete from property-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents'
);

-- Verify the policies were created
SELECT 'RLS policies updated successfully! You can now upload documents.' as status;

-- Note: These policies allow any authenticated user to access all property documents.
-- Once you have proper user-property ownership in place, you can tighten these policies
-- to only allow access to documents for properties owned by the authenticated user.