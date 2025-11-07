-- =====================================================================
-- Fix Interest Rate Precision - OwnerIQ
-- =====================================================================
-- Changes interest rate fields from NUMERIC(5,2) to NUMERIC(5,3)
-- to support rates like 6.237% instead of only 6.24%
--
-- Date: October 31, 2025
-- =====================================================================

BEGIN;

-- Update property table - loan_rate field
ALTER TABLE property
ALTER COLUMN loan_rate TYPE NUMERIC(5,3);

-- Update property table - interest_rate field
ALTER TABLE property
ALTER COLUMN interest_rate TYPE NUMERIC(5,3);

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Interest Rate Precision Update Completed Successfully';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated Fields:';
  RAISE NOTICE '  ✓ property.loan_rate: NUMERIC(5,2) → NUMERIC(5,3)';
  RAISE NOTICE '  ✓ property.interest_rate: NUMERIC(5,2) → NUMERIC(5,3)';
  RAISE NOTICE '';
  RAISE NOTICE 'These fields can now store rates like 6.237% with 3 decimal places';
  RAISE NOTICE '================================================================';
END $$;

COMMIT;
