-- Add is_primary_residence field to property table
ALTER TABLE property 
ADD COLUMN IF NOT EXISTS is_primary_residence BOOLEAN DEFAULT false;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_property_is_primary_residence 
ON property(is_primary_residence);

-- Add comment
COMMENT ON COLUMN property.is_primary_residence IS 'Indicates if this is the owner''s primary residence (true) or investment property (false)';
