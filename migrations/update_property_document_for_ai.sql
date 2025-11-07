-- =====================================================================
-- UPDATE PROPERTY_DOCUMENT TABLE FOR AI PROCESSING
-- Agregar campo metadata y actualizar enum document_type
-- =====================================================================

-- 1. Agregar campo metadata si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_document'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE property_document ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN property_document.metadata IS 'AI processing metadata: classification_confidence, extracted_fields_count, validation_status, etc.';
  END IF;
END $$;

-- 2. Crear índice GIN para búsquedas en metadata JSONB
CREATE INDEX IF NOT EXISTS idx_property_document_metadata ON property_document USING GIN (metadata);

-- 3. Actualizar enum document_type para incluir tipos de AI
-- Primero verificar si el tipo es un enum
DO $$
DECLARE
  is_enum boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'document_type' AND typtype = 'e'
  ) INTO is_enum;

  IF is_enum THEN
    -- Agregar nuevos valores al enum si no existen
    -- Nota: No se pueden agregar valores si ya existen, por eso usamos IF NOT EXISTS indirectamente
    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'closing_alta';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'home_owner_insurance';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'tax_bill';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'mortgage_statement';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'first_payment_letter';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'initial_escrow';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'exhibit_a';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'unknown';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  ELSE
    -- Si document_type es TEXT, no hacemos nada
    RAISE NOTICE 'document_type is TEXT type, no enum update needed';
  END IF;
END $$;

-- 4. Verificar la estructura final
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'property_document'
ORDER BY ordinal_position;

-- 5. Mostrar los valores del enum document_type (si es enum)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type' AND typtype = 'e') THEN
    RAISE NOTICE 'Current document_type enum values:';
    PERFORM enumlabel FROM pg_enum
    WHERE enumtypid = 'document_type'::regtype
    ORDER BY enumsortorder;
  END IF;
END $$;
