-- =====================================================================
-- PERSON / INVESTOR LAYER (Patch for existing rei schema)
-- =====================================================================
SET search_path = public;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0) Small enums
DO $$ BEGIN
  CREATE TYPE person_kind AS ENUM ('individual','organization');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_kind AS ENUM ('email','mobile','phone','whatsapp','telegram','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE address_kind AS ENUM ('home','mailing','office','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending','in_review','verified','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE accreditation AS ENUM ('unknown','non_accredited','accredited_rule501','qualified_purchaser');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_tolerance AS ENUM ('conservative','moderate','aggressive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invest_strategy AS ENUM ('cashflow','appreciation','brrrr','flip','short_term_rental','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portfolio_role AS ENUM ('owner','manager','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_kind AS ENUM ('marketing','data_processing','recommendations','alerts');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_type AS ENUM ('single_family','townhouse','condo','multi_family','commercial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE decision_kind AS ENUM ('accepted','considering','dismissed','notified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Base tables
CREATE TABLE IF NOT EXISTS region (
  region_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code      TEXT,
  city            TEXT,
  zip_code        TEXT,
  msa_name        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property (
  property_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,

  -- Basic Property Information
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip_code        TEXT,
  property_address_legal_description TEXT,
  property_type   TEXT,
  property_sqf    NUMERIC(10,2),
  construction_year INT,

  -- Financial Information
  valuation       NUMERIC(14,2),
  purchase_price  NUMERIC(14,2),
  refinance_price NUMERIC(14,2),
  purchase_refinance_closing_date DATE,

  -- Income Information
  rent            NUMERIC(10,2),
  gross_monthly_income_rent NUMERIC(10,2),
  property_management_percentage NUMERIC(5,2),
  property_management_amount NUMERIC(10,2),
  net_monthly_income NUMERIC(10,2),

  -- Operating Expenses
  taxes           NUMERIC(10,2),
  insurance       NUMERIC(10,2),
  hoa             NUMERIC(10,2),
  maintenance     NUMERIC(5,2),
  vacancy         NUMERIC(5,2),

  -- Loan Information
  loan_rate       NUMERIC(5,2),
  loan_term       INT,
  loan_amount     NUMERIC(14,2),
  loan_number     TEXT,
  monthly_payment_principal_interest NUMERIC(10,2),
  escrow_property_tax NUMERIC(10,2),
  escrow_home_owner_insurance NUMERIC(10,2),
  total_monthly_payment_piti NUMERIC(10,2),
  home_owner_insurance_initial_escrow NUMERIC(10,2),
  property_taxes_initial_escrow NUMERIC(10,2),
  first_payment_date DATE,
  pre_payment_penalty TEXT,
  ltv             NUMERIC(5,2),
  down_payment    NUMERIC(14,2),

  -- Tax Information
  year_1          NUMERIC(10,2),
  year_2          NUMERIC(10,2),
  year_3          NUMERIC(10,2),
  year_4          NUMERIC(10,2),
  year_5          NUMERIC(10,2),
  property_tax_county TEXT,
  tax_authority   TEXT,
  tax_authority_web_page TEXT,
  account_number  TEXT,
  assessed_value  NUMERIC(14,2),
  taxes_paid_last_year NUMERIC(10,2),
  property_tax_percentage NUMERIC(5,2),

  -- Insurance Information
  insurance_initial_premium NUMERIC(10,2),
  insurance_company TEXT,
  insurance_agent_name TEXT,
  insurance_agent_contact TEXT,
  insurance_agent_phone_number TEXT,
  insurance_agent_email_address TEXT,
  insurance_policy_number TEXT,
  hoi_effective_date DATE,
  hoi_expiration_date DATE,
  coverage_a_dwelling NUMERIC(14,2),
  coverage_b_other_structures NUMERIC(14,2),
  coverage_c_personal_property NUMERIC(14,2),
  coverage_d_fair_rental_value NUMERIC(14,2),
  coverage_e_additional_living_expenses NUMERIC(14,2),

  -- Lease Information
  initial_lease_tenant_name TEXT,
  lease_effective_date DATE,
  lease_termination_date DATE,

  -- Owner Information
  owner_name      TEXT,
  owner_principal_address TEXT,
  owner_phone_number TEXT,
  owner_email_address TEXT,
  company_name    TEXT,
  company_address TEXT,
  company_phone_number TEXT,
  company_email_address TEXT,

  -- Title Company Information
  title_company   TEXT,
  title_company_contact TEXT,
  title_company_phone_number TEXT,
  title_company_email_address TEXT,

  -- Lender Information
  lender_mortgage_name TEXT,
  lender_mortgage_address TEXT,
  lender_mortgage_phone TEXT,
  lender_mortgage_web_page TEXT,
  mortgage_servicing_company TEXT,
  mortgage_servicing_company_address TEXT,
  mortgage_servicing_company_phone_number TEXT,
  lender_web_page TEXT,

  -- Borrower Information
  borrower_name   TEXT,
  lender_name     TEXT,
  closing_date    DATE,

  -- Additional Fields
  monthly_payment NUMERIC(10,2),
  interest_rate   NUMERIC(5,2),
  term_years      INT,
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dealscore_rule_set (
  rule_set_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  cap_weight      NUMERIC(6,3) NOT NULL DEFAULT 0.25,
  coc_weight      NUMERIC(6,3) NOT NULL DEFAULT 0.25,
  dscr_weight     NUMERIC(6,3) NOT NULL DEFAULT 0.15,
  appreciation_weight NUMERIC(6,3) NOT NULL DEFAULT 0.15,
  risk_weight     NUMERIC(6,3) NOT NULL DEFAULT 0.10,
  liquidity_weight NUMERIC(6,3) NOT NULL DEFAULT 0.10,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio (
  portfolio_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   UUID,  -- assuming exists
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing tables for metrics
CREATE TABLE IF NOT EXISTS property_valuation (
  valuation_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  amount_usd      NUMERIC(14,2) NOT NULL,
  as_of_date      DATE NOT NULL,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_rent_estimate (
  rent_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  market_rent_month NUMERIC(10,2) NOT NULL,
  as_of_date      DATE NOT NULL,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_operating_inputs (
  input_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  vacancy_rate_pct NUMERIC(5,2),
  taxes_annual    NUMERIC(10,2),
  insurance_annual NUMERIC(10,2),
  hoa_monthly     NUMERIC(10,2),
  maintenance_pct NUMERIC(5,2),
  other_opex_annual NUMERIC(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_loan (
  loan_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  interest_rate_pct NUMERIC(5,2),
  term_months     INT,
  ltv_pct         NUMERIC(5,2),
  principal_usd   NUMERIC(14,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_stats (
  stats_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id       UUID REFERENCES region(region_id) ON DELETE SET NULL,
  days_on_market  INT,
  appreciation_yoy NUMERIC(6,3),
  vacancy_rate    NUMERIC(5,2),
  inventory       INT,
  price_cut_rate  NUMERIC(5,2),
  as_of_date      DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_metrics (
  metrics_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  noi             NUMERIC(14,2),
  cap_rate        NUMERIC(6,3),
  cash_on_cash    NUMERIC(6,3),
  dscr            NUMERIC(6,3),
  cash_flow_net   NUMERIC(14,2),
  debt_service_ann NUMERIC(14,2),
  as_of_date      DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_dealscore (
  dealscore_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  rule_set_id     UUID NOT NULL REFERENCES dealscore_rule_set(rule_set_id) ON DELETE RESTRICT,
  dealscore       NUMERIC(6,4),
  cap_rate_norm   NUMERIC(6,4),
  coc_norm        NUMERIC(6,4),
  dscr_norm       NUMERIC(6,4),
  appreciation_norm NUMERIC(6,4),
  risk_norm       NUMERIC(6,4),
  liquidity_norm  NUMERIC(6,4),
  recommendation   TEXT,
  explanation     TEXT,
  as_of_date      DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1) Core person / organization
CREATE TABLE IF NOT EXISTS person (
  person_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             person_kind NOT NULL DEFAULT 'individual',
  full_name        TEXT NOT NULL,
  first_name       TEXT,
  last_name        TEXT,
  primary_email    TEXT,
  primary_phone    TEXT,
  external_ref     TEXT,                  -- CRM id, etc.
  dob              DATE,                  -- optional (PII—use carefully)
  tax_id_hash      TEXT,                  -- store hashed if needed
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (primary_email)
);

-- Note: Assuming app_user is handled separately or using person for auth

-- 2) Contacts & addresses
CREATE TABLE IF NOT EXISTS person_contact (
  contact_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  kind             contact_kind NOT NULL,
  value            TEXT NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS u_person_primary_contact
  ON person_contact(person_id, kind) WHERE is_primary;

CREATE TABLE IF NOT EXISTS person_address (
  address_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  kind             address_kind NOT NULL DEFAULT 'home',
  line1            TEXT NOT NULL,
  line2            TEXT,
  city             TEXT NOT NULL,
  state_code       TEXT,
  postal_code      TEXT,
  country_code     TEXT NOT NULL DEFAULT 'US',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Investor profile / KYC / funding
CREATE TABLE IF NOT EXISTS investor_profile (
  person_id            UUID PRIMARY KEY REFERENCES person(person_id) ON DELETE CASCADE,
  kyc_status           kyc_status NOT NULL DEFAULT 'pending',
  accreditation_status accreditation NOT NULL DEFAULT 'unknown',
  risk_tolerance       risk_tolerance NOT NULL DEFAULT 'moderate',
  investment_horizon_y INT,                 -- years
  annual_income_usd    NUMERIC(14,2),
  net_worth_usd        NUMERIC(14,2),
  liquidity_usd        NUMERIC(14,2),
  notes                TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funding_profile (
  funding_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  cash_available_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_ltv_pct    NUMERIC(5,2) CHECK (target_ltv_pct BETWEEN 0 AND 100),
  prefers_fixed     BOOLEAN,
  preferred_lenders TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Buy Box (what the AI uses to tailor recommendations)
CREATE TABLE IF NOT EXISTS buy_box (
  buy_box_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  name             TEXT NOT NULL DEFAULT 'Default',
  min_price_usd    NUMERIC(14,2),
  max_price_usd    NUMERIC(14,2),
  min_coc          NUMERIC(6,3),
  min_cap_rate     NUMERIC(6,3),
  min_dscr         NUMERIC(6,3),
  max_vacancy_pct  NUMERIC(5,2),
  target_ltv_pct   NUMERIC(5,2),
  strategy         invest_strategy NOT NULL DEFAULT 'cashflow',
  climate_risk_max NUMERIC(6,3),                -- optional index 0..1
  property_types   property_type[] DEFAULT ARRAY[]::property_type[],
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-market weights/preferences inside a Buy Box
CREATE TABLE IF NOT EXISTS buy_box_market (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_box_id       UUID NOT NULL REFERENCES buy_box(buy_box_id) ON DELETE CASCADE,
  region_id        UUID NOT NULL REFERENCES region(region_id) ON DELETE RESTRICT,
  weight           NUMERIC(6,3) NOT NULL DEFAULT 1.0,  -- >1 prefer, <1 de-prioritize
  UNIQUE (buy_box_id, region_id)
);

-- Optional normalized property type list per buy box (if not using array)
CREATE TABLE IF NOT EXISTS buy_box_property_type (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_box_id       UUID NOT NULL REFERENCES buy_box(buy_box_id) ON DELETE CASCADE,
  type             property_type NOT NULL,
  UNIQUE (buy_box_id, type)
);

-- 5) Portfolio membership (multi-user / client sharing)
-- Keep existing portfolio.owner_user_id. This adds people with roles.
CREATE TABLE IF NOT EXISTS portfolio_member (
  portfolio_id     UUID NOT NULL REFERENCES portfolio(portfolio_id) ON DELETE CASCADE,
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  role             portfolio_role NOT NULL DEFAULT 'viewer',
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, person_id)
);

-- 6) Consents (for compliant notifications & AI use)
CREATE TABLE IF NOT EXISTS consent_event (
  consent_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  kind             consent_kind NOT NULL,
  granted          BOOLEAN NOT NULL,
  scope            TEXT,                     -- e.g., "email,sms" or policy version
  event_time       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) Watchlists & saved searches
CREATE TABLE IF NOT EXISTS watchlist (
  watchlist_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  name             TEXT NOT NULL DEFAULT 'My Watchlist',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_item (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id     UUID NOT NULL REFERENCES watchlist(watchlist_id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (watchlist_id, property_id)
);

CREATE TABLE IF NOT EXISTS saved_search (
  saved_search_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  query_json       JSONB NOT NULL,           -- serialized filters (price, beds, geo…)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) Recommendation log (what AI proposed to whom, with DealScore snapshot)
CREATE TABLE IF NOT EXISTS recommendation_log (
  rec_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  rule_set_id      UUID NOT NULL REFERENCES dealscore_rule_set(rule_set_id) ON DELETE RESTRICT,
  as_of_date       DATE NOT NULL,
  dealscore        NUMERIC(6,4) NOT NULL CHECK (dealscore BETWEEN 0 AND 1),
  cap_rate         NUMERIC(8,5) NOT NULL,
  cash_on_cash     NUMERIC(8,5) NOT NULL,
  dscr             NUMERIC(8,5) NOT NULL,
  cash_needed_usd  NUMERIC(14,2),
  decision         decision_kind,            -- accepted/considering/dismissed/notified
  decision_time    TIMESTAMPTZ,
  why              TEXT,                     -- short bullet list
  risks            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rec_person_date ON recommendation_log(person_id, as_of_date DESC);

-- 9) Helpful views
-- Latest active buy box per person
CREATE OR REPLACE VIEW v_person_active_buy_box AS
SELECT DISTINCT ON (b.person_id)
  b.*
FROM buy_box b
WHERE b.is_active
ORDER BY b.person_id, b.created_at DESC;

-- Last recommendation outcome per person & property
CREATE OR REPLACE VIEW v_last_recommendation AS
SELECT DISTINCT ON (r.person_id, r.property_id)
  r.*
FROM recommendation_log r
ORDER BY r.person_id, r.property_id, r.created_at DESC;

-- 10) Seed an example person + a default buy box (optional)
INSERT INTO person (full_name, first_name, last_name, primary_email, primary_phone)
VALUES ('John Doe','John','Doe','john@example.com','+1-555-123-4567')
ON CONFLICT (primary_email) DO NOTHING;

INSERT INTO investor_profile (person_id, kyc_status, accreditation_status, risk_tolerance, investment_horizon_y)
SELECT person_id, 'verified','accredited_rule501','moderate',7
FROM person WHERE primary_email='john@example.com'
ON CONFLICT (person_id) DO NOTHING;

INSERT INTO buy_box (person_id, name, min_price_usd, max_price_usd, min_coc, min_cap_rate, min_dscr,
                     target_ltv_pct, strategy, property_types, is_active)
SELECT person_id, 'Default', 150000, 600000, 0.08, 0.055, 1.25, 75, 'cashflow',
       ARRAY['single_family','townhouse']::property_type[], TRUE
FROM person WHERE primary_email='john@example.com'
ON CONFLICT DO NOTHING;-- =====================================================================
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