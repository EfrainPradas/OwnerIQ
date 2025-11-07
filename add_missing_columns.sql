-- Add missing columns to property table
ALTER TABLE property
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS property_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing properties to have a default property_type
UPDATE property
SET property_type = 'residential'
WHERE property_type IS NULL;