-- Migration to add all the new property fields for document extraction
-- Run this after backing up your database

-- Add basic property information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_address_legal_description TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_sqf NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS construction_year INT;

-- Add financial information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS refinance_price NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS purchase_refinance_closing_date DATE;

-- Add income information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS gross_monthly_income_rent NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_management_percentage NUMERIC(5,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_management_amount NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS net_monthly_income NUMERIC(10,2);

-- Add loan information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS loan_amount NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS loan_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS monthly_payment_principal_interest NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS escrow_property_tax NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS escrow_home_owner_insurance NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS total_monthly_payment_piti NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS home_owner_insurance_initial_escrow NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_taxes_initial_escrow NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS first_payment_date DATE;
ALTER TABLE property ADD COLUMN IF NOT EXISTS pre_payment_penalty TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS down_payment NUMERIC(14,2);

-- Add tax information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS year_1 NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS year_2 NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS year_3 NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS year_4 NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS year_5 NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_tax_county TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS tax_authority TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS tax_authority_web_page TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS assessed_value NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS taxes_paid_last_year NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_tax_percentage NUMERIC(5,2);

-- Add insurance information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_initial_premium NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_company TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_agent_name TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_agent_contact TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_agent_phone_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_agent_email_address TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS hoi_effective_date DATE;
ALTER TABLE property ADD COLUMN IF NOT EXISTS hoi_expiration_date DATE;
ALTER TABLE property ADD COLUMN IF NOT EXISTS coverage_a_dwelling NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS coverage_b_other_structures NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS coverage_c_personal_property NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS coverage_d_fair_rental_value NUMERIC(14,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS coverage_e_additional_living_expenses NUMERIC(14,2);

-- Add lease information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS initial_lease_tenant_name TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS lease_effective_date DATE;
ALTER TABLE property ADD COLUMN IF NOT EXISTS lease_termination_date DATE;

-- Add owner information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_principal_address TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_phone_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_email_address TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS company_phone_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS company_email_address TEXT;

-- Add title company information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS title_company TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS title_company_contact TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS title_company_phone_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS title_company_email_address TEXT;

-- Add lender information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS lender_mortgage_name TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS lender_mortgage_address TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS lender_mortgage_phone TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS lender_mortgage_web_page TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS mortgage_servicing_company TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS mortgage_servicing_company_address TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS mortgage_servicing_company_phone_number TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS lender_web_page TEXT;

-- Add borrower information columns
ALTER TABLE property ADD COLUMN IF NOT EXISTS borrower_name TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS lender_name TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS closing_date DATE;

-- Add additional fields
ALTER TABLE property ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC(10,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,2);
ALTER TABLE property ADD COLUMN IF NOT EXISTS term_years INT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add updated_at column
ALTER TABLE property ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Create an index on person_id for better performance
CREATE INDEX IF NOT EXISTS idx_property_person_id ON property(person_id);

-- Create an index on address for search performance
CREATE INDEX IF NOT EXISTS idx_property_address ON property(address);

-- Create an index on city for location-based queries
CREATE INDEX IF NOT EXISTS idx_property_city ON property(city);

-- Create an index on state for location-based queries
CREATE INDEX IF NOT EXISTS idx_property_state ON property(state);

-- Create an index on zip_code for location-based queries
CREATE INDEX IF NOT EXISTS idx_property_zip_code ON property(zip_code);

-- Create an index on property_type for filtering
CREATE INDEX IF NOT EXISTS idx_property_type ON property(property_type);

-- Create an index on valuation for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_property_valuation ON property(valuation);

-- Create an index on loan_amount for financial queries
CREATE INDEX IF NOT EXISTS idx_property_loan_amount ON property(loan_amount);

-- Create an index on insurance_policy_number for search
CREATE INDEX IF NOT EXISTS idx_property_insurance_policy_number ON property(insurance_policy_number);

-- Create an index on loan_number for search
CREATE INDEX IF NOT EXISTS idx_property_loan_number ON property(loan_number);

-- Create an index on account_number for tax-related queries
CREATE INDEX IF NOT EXISTS idx_property_account_number ON property(account_number);

-- Create an index on borrower_name for search
CREATE INDEX IF NOT EXISTS idx_property_borrower_name ON property(borrower_name);

-- Create an index on lender_name for search
CREATE INDEX IF NOT EXISTS idx_property_lender_name ON property(lender_name);

-- Create an index on insurance_company for search
CREATE INDEX IF NOT EXISTS idx_property_insurance_company ON property(insurance_company);

-- Create an index on initial_lease_tenant_name for search
CREATE INDEX IF NOT EXISTS idx_property_initial_lease_tenant_name ON property(initial_lease_tenant_name);

-- Create an index on owner_name for search
CREATE INDEX IF NOT EXISTS idx_property_owner_name ON property(owner_name);

-- Create an index on company_name for search
CREATE INDEX IF NOT EXISTS idx_property_company_name ON property(company_name);

-- Create an index on title_company for search
CREATE INDEX IF NOT EXISTS idx_property_title_company ON property(title_company);

-- Create an index on lender_mortgage_name for search
CREATE INDEX IF NOT EXISTS idx_property_lender_mortgage_name ON property(lender_mortgage_name);

-- Create an index on mortgage_servicing_company for search
CREATE INDEX IF NOT EXISTS idx_property_mortgage_servicing_company ON property(mortgage_servicing_company);

-- Create a partial index on updated_at for recent updates
CREATE INDEX IF NOT EXISTS idx_property_recent_updates ON property(updated_at) WHERE updated_at > now() - interval '30 days';

-- Create a composite index for common queries (person_id + valuation)
CREATE INDEX IF NOT EXISTS idx_property_person_valuation ON property(person_id, valuation);

-- Create a composite index for location queries (state + city)
CREATE INDEX IF NOT EXISTS idx_property_location ON property(state, city);

-- Create a composite index for financial queries (loan_amount + valuation)
CREATE INDEX IF NOT EXISTS idx_property_financial ON property(loan_amount, valuation);

-- Create a composite index for insurance queries (insurance_company + insurance_policy_number)
CREATE INDEX IF NOT EXISTS idx_property_insurance_lookup ON property(insurance_company, insurance_policy_number);

-- Create a composite index for tax queries (property_tax_county + account_number)
CREATE INDEX IF NOT EXISTS idx_property_tax_lookup ON property(property_tax_county, account_number);