-- =====================================================
-- MORTGAGE PAYMENT SCHEDULE TABLE
-- =====================================================
-- This table stores the complete amortization schedule
-- for each property's mortgage loan
-- =====================================================

CREATE TABLE IF NOT EXISTS mortgage_payment_schedule (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,

  -- Payment Info
  payment_number INT NOT NULL,
  payment_date DATE NOT NULL,
  payment_year INT,

  -- Interest Info
  interest_rate DECIMAL(10, 6) NOT NULL,
  interest_due DECIMAL(12, 2) NOT NULL,

  -- Payment Breakdown
  payment_due DECIMAL(12, 2) NOT NULL,
  extra_payments DECIMAL(12, 2) DEFAULT 0,
  principal_paid DECIMAL(12, 2) NOT NULL,

  -- Balance & LTV
  balance DECIMAL(12, 2) NOT NULL,
  ltv DECIMAL(10, 6),

  -- Tax Deductions
  tax_returned DECIMAL(12, 2),
  cumulative_tax_returned DECIMAL(12, 2),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_property_payment UNIQUE (property_id, payment_number),
  CHECK (payment_number > 0),
  CHECK (balance >= 0),
  CHECK (interest_due >= 0),
  CHECK (principal_paid >= 0)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mortgage_schedule_property
  ON mortgage_payment_schedule(property_id);

CREATE INDEX IF NOT EXISTS idx_mortgage_schedule_payment_date
  ON mortgage_payment_schedule(payment_date);

CREATE INDEX IF NOT EXISTS idx_mortgage_schedule_year
  ON mortgage_payment_schedule(payment_year);

-- =====================================================
-- MORTGAGE SUMMARY TABLE
-- =====================================================
-- This table stores summary calculations for each property
-- =====================================================

CREATE TABLE IF NOT EXISTS mortgage_summary (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES property(property_id) ON DELETE CASCADE,

  -- Loan Details
  loan_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(10, 6) NOT NULL,
  term_years INT NOT NULL,
  first_payment_date DATE NOT NULL,

  -- Monthly Payments
  monthly_payment_pi DECIMAL(12, 2) NOT NULL, -- Principal + Interest
  monthly_payment_piti DECIMAL(12, 2) NOT NULL, -- + Taxes + Insurance

  -- Property Info
  home_value DECIMAL(12, 2),
  yearly_property_taxes DECIMAL(12, 2),
  yearly_hoi DECIMAL(12, 2),
  monthly_pmi DECIMAL(12, 2),

  -- Summary Totals
  total_payments DECIMAL(12, 2) NOT NULL,
  total_interest DECIMAL(12, 2) NOT NULL,
  total_principal DECIMAL(12, 2) NOT NULL,

  -- Tax Benefits
  tax_bracket DECIMAL(5, 4) DEFAULT 0.15, -- 15% default
  total_tax_returned DECIMAL(12, 2),
  effective_interest_rate DECIMAL(10, 6),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mortgage_summary_property
  ON mortgage_summary(property_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE mortgage_payment_schedule IS
  'Stores the complete amortization schedule (360 rows per 30-year mortgage)';

COMMENT ON TABLE mortgage_summary IS
  'Stores summary calculations and totals for each property mortgage';

COMMENT ON COLUMN mortgage_payment_schedule.payment_number IS
  'Payment number from 1 to total_payments (e.g., 1-360 for 30-year mortgage)';

COMMENT ON COLUMN mortgage_payment_schedule.payment_year IS
  'Year of the loan (1-30), increments every 12 payments';

COMMENT ON COLUMN mortgage_payment_schedule.ltv IS
  'Loan-to-Value ratio: current balance / home value';

COMMENT ON COLUMN mortgage_summary.monthly_payment_pi IS
  'Monthly payment for Principal + Interest only';

COMMENT ON COLUMN mortgage_summary.monthly_payment_piti IS
  'Monthly payment including Principal, Interest, Taxes, and Insurance';
