-- Script para crear los tipos de documentos necesarios para el onboarding
-- Ejecutar este script en Supabase SQL Editor

INSERT INTO document_types (doc_type_id, name, description, is_optional)
VALUES 
  ('closing', 'Closing Statement', 'HUD-1 or final closing statement', false),
  ('disclosure', 'Closing Disclosure', 'Final loan disclosure document', false),
  ('mortgage', 'Mortgage Statement', 'Most recent mortgage statement', false),
  ('insurance', 'Property Insurance', 'Homeowners insurance policy', false),
  ('tax', 'Property Tax Bill', 'Latest property tax statement', false),
  ('utilities', 'Utilities Bill', 'Recent utility bill', false),
  ('warranty', 'Appliance Warranty', 'Warranty documents for appliances', false),
  ('appraisal', 'Property Appraisal', 'Professional appraisal report', true),
  ('hoa', 'HOA Documents', 'Homeowners association bylaws and fees', true)
ON CONFLICT (doc_type_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_optional = EXCLUDED.is_optional;
