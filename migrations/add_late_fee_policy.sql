-- Add late_fee_policy column to property table
ALTER TABLE property ADD COLUMN IF NOT EXISTS late_fee_policy TEXT;
