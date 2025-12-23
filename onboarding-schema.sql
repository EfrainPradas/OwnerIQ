-- =====================================================================
-- OWNERIQ ONBOARDING & PROPERTY MANAGEMENT EXTENSION
-- =====================================================================

-- 1. User Profiles Table for Onboarding Flow
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  owner_name VARCHAR(255) NOT NULL,
  owner_email VARCHAR(255) NOT NULL UNIQUE,
  owner_phone VARCHAR(50) NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('HOMEOWNER', 'INVESTOR')),
  has_primary_residence BOOLEAN DEFAULT false,
  investment_property_count INTEGER DEFAULT 0 CHECK (investment_property_count >= 0 AND investment_property_count <= 10),
  onboarding_status VARCHAR(20) DEFAULT 'INCOMPLETE' CHECK (onboarding_status IN ('INCOMPLETE', 'IN_PROGRESS', 'COMPLETED')),
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Entities Table for Company Management
CREATE TABLE IF NOT EXISTS entities (
  entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  entity_type VARCHAR(20) DEFAULT 'company' CHECK (entity_type IN ('company', 'llc', 'trust')),
  entity_name VARCHAR(255) NOT NULL,
  ein VARCHAR(20),
  entity_email VARCHAR(255),
  entity_phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Import Batches for Document Processing
CREATE TABLE IF NOT EXISTS import_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  property_type VARCHAR(20) NOT NULL CHECK (property_type IN ('primary_residence', 'investment')),
  entity_id UUID REFERENCES entities(entity_id) ON DELETE SET NULL,
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  refinanced BOOLEAN,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  documents_completed INTEGER DEFAULT 0,
  documents_required INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Document Types Table
CREATE TABLE IF NOT EXISTS document_types (
  doc_type_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_required_for_all BOOLEAN DEFAULT false,
  is_required_for_investor BOOLEAN DEFAULT false,
  is_optional BOOLEAN DEFAULT false,
  max_file_size_mb INTEGER DEFAULT 5,
  allowed_formats TEXT[] DEFAULT ARRAY['PDF', 'JPG', 'PNG'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Document Uploads Table
CREATE TABLE IF NOT EXISTS document_uploads (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES import_batches(batch_id) ON DELETE CASCADE,
  doc_type_id VARCHAR(50) NOT NULL REFERENCES document_types(doc_type_id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  upload_status VARCHAR(20) DEFAULT 'UPLOADED' CHECK (upload_status IN ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'EXPIRED')),
  ai_confidence DECIMAL(5,4),
  extracted_data JSONB,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- 6. Property Onboarding Link Table
CREATE TABLE IF NOT EXISTS property_onboarding (
  onboarding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES import_batches(batch_id) ON DELETE CASCADE,
  property_id UUID REFERENCES property(property_id) ON DELETE SET NULL,
  person_id UUID REFERENCES person(person_id) ON DELETE SET NULL,
  entity_id UUID REFERENCES entities(entity_id) ON DELETE SET NULL,
  onboarding_status VARCHAR(20) DEFAULT 'PENDING' CHECK (onboarding_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Property Command Center Extensions
-- Add new fields to existing property table for command center features
ALTER TABLE property ADD COLUMN IF NOT EXISTS current_market_value_estimate DECIMAL(12,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS legal_description TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS apn_parcel_number VARCHAR(50);
ALTER TABLE property ADD COLUMN IF NOT EXISTS county VARCHAR(100);
ALTER TABLE property ADD COLUMN IF NOT EXISTS assessed_value DECIMAL(12,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS taxable_value DECIMAL(12,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS tax_rate_percent DECIMAL(5,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS annual_tax_amount DECIMAL(12,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS taxes_paid_ytd DECIMAL(12,2);

-- Mortgage additional fields
ALTER TABLE property ADD COLUMN IF NOT EXISTS servicer_name VARCHAR(255);
ALTER TABLE property ADD COLUMN IF NOT EXISTS term_months INTEGER;
ALTER TABLE property ADD COLUMN IF NOT EXISTS maturity_date DATE;
ALTER TABLE property ADD COLUMN IF NOT EXISTS principal_interest_monthly DECIMAL(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_taxes_monthly DECIMAL(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_monthly DECIMAL(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS hoa_monthly DECIMAL(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS pmi_monthly DECIMAL(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS other_monthly DECIMAL(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS ytd_principal_paid DECIMAL(12,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS ytd_interest_paid DECIMAL(12,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2);

-- Insurance additional fields
ALTER TABLE property ADD COLUMN IF NOT EXISTS coverage_b_structures DECIMAL(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS coverage_c_property DECIMAL(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255);
ALTER TABLE property ADD COLUMN IF NOT EXISTS agent_phone VARCHAR(50);
ALTER TABLE property ADD COLUMN IF NOT EXISTS agent_email VARCHAR(255);

-- 8. Utilities Table
CREATE TABLE IF NOT EXISTS property_utilities (
  utility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  utility_type VARCHAR(20) NOT NULL CHECK (utility_type IN ('electric', 'water', 'gas', 'internet', 'trash', 'sewer')),
  company_name VARCHAR(255),
  account_number VARCHAR(100),
  meter_number VARCHAR(100),
  customer_portal_url TEXT,
  monthly_average_cost DECIMAL(8,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Appliances Table
CREATE TABLE IF NOT EXISTS property_appliances (
  appliance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  appliance_type VARCHAR(50) NOT NULL CHECK (appliance_type IN ('hvac', 'water_heater', 'refrigerator', 'dishwasher', 'oven', 'microwave', 'washer', 'dryer', 'garage_door', 'other')),
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  sku VARCHAR(100),
  purchase_date DATE,
  warranty_expiration_date DATE,
  price DECIMAL(8,2),
  quantity INTEGER DEFAULT 1,
  installation_notes TEXT,
  condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(owner_email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_entities_user_id ON entities(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_document_uploads_batch_id ON document_uploads(batch_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_status ON document_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_property_utilities_property_id ON property_utilities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_appliances_property_id ON property_appliances(property_id);

-- 11. Insert Document Types
INSERT INTO document_types (doc_type_id, name, description, is_required_for_all, is_required_for_investor, is_optional) VALUES
('closing_statement', 'Closing Statement', 'HUD-1 or final closing statement from property purchase', true, false, false),
('closing_disclosure', 'Closing Disclosure', 'Final loan disclosure document with all terms', true, false, false),
('mortgage_statement', 'Mortgage Statement', 'Most recent mortgage statement showing balance and payment', true, false, false),
('property_insurance', 'Property Insurance', 'Homeowners insurance policy documents', true, false, false),
('property_tax_bill', 'Property Tax Bill', 'Latest property tax statement and assessment', true, false, false),
('utilities_bill', 'Utilities Bill', 'Recent utility bill (water, electric, or gas)', true, false, false),
('appliance_warranty', 'Appliance Warranty', 'Warranty documents for appliances', true, false, false),
('appraisal', 'Property Appraisal', 'Professional appraisal report', false, true, false),
('hoa_documents', 'HOA Documents', 'Homeowners association bylaws and fees', false, false, true)
ON CONFLICT (doc_type_id) DO NOTHING;

-- 12. RLS Policies (if using Supabase)
-- These would need to be enabled in Supabase dashboard

-- Create policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create policies for entities
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own entities" ON entities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own entities" ON entities FOR ALL USING (user_id = auth.uid());

-- Create policies for import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own batches" ON import_batches FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own batches" ON import_batches FOR ALL USING (user_id = auth.uid());

-- Create policies for document_uploads
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own uploads" ON document_uploads FOR SELECT USING (
  batch_id IN (SELECT batch_id FROM import_batches WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own uploads" ON document_uploads FOR ALL USING (
  batch_id IN (SELECT batch_id FROM import_batches WHERE user_id = auth.uid())
);

-- 13. Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_import_batches_updated_at BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_utilities_updated_at BEFORE UPDATE ON property_utilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_appliances_updated_at BEFORE UPDATE ON property_appliances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();