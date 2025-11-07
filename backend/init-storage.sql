-- Crear bucket para documentos de propiedades
-- Este script debe ejecutarse en Supabase SQL Editor

-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  true,  -- Public para obtener URLs públicas
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas de acceso
-- Permitir lectura pública
CREATE POLICY IF NOT EXISTS "Public Access to property documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-documents');

-- Permitir subida solo a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Authenticated users can upload property documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents'
  AND auth.role() = 'authenticated'
);

-- Permitir actualización solo a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Authenticated users can update property documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-documents'
  AND auth.role() = 'authenticated'
);

-- Permitir eliminación solo a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Authenticated users can delete property documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents'
  AND auth.role() = 'authenticated'
);
