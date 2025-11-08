-- ============================================================================
-- HELOC & EQUITY MANAGEMENT SCHEMA
-- ============================================================================
-- Purpose: Track property equity, HELOC lines, and leverage strategies
-- Date: November 2025
-- ============================================================================

-- Table: property_valuation
-- Tracks property market value over time for appreciation analysis
CREATE TABLE IF NOT EXISTS property_valuation (
    valuation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,

    -- Valuation details
    valuation_date DATE NOT NULL,
    market_value NUMERIC(12, 2) NOT NULL,
    valuation_source VARCHAR(100), -- 'appraisal', 'zillow', 'manual', 'refinance'

    -- Appreciation tracking
    original_purchase_price NUMERIC(12, 2),
    appreciation_amount NUMERIC(12, 2) GENERATED ALWAYS AS (market_value - COALESCE(original_purchase_price, 0)) STORED,
    appreciation_percent NUMERIC(10, 6) GENERATED ALWAYS AS (
        CASE
            WHEN COALESCE(original_purchase_price, 0) > 0
            THEN (market_value - original_purchase_price) / original_purchase_price
            ELSE 0
        END
    ) STORED,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_property_valuation_date UNIQUE(property_id, valuation_date)
);

CREATE INDEX idx_property_valuation_property ON property_valuation(property_id);
CREATE INDEX idx_property_valuation_date ON property_valuation(valuation_date);


-- Table: heloc_line
-- Tracks Home Equity Lines of Credit
CREATE TABLE IF NOT EXISTS heloc_line (
    heloc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,

    -- HELOC details
    lender_name VARCHAR(255),
    account_number VARCHAR(100),
    open_date DATE NOT NULL,
    close_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'frozen', 'closed', 'paid_off'

    -- Credit line amounts
    max_credit_limit NUMERIC(12, 2) NOT NULL,
    available_credit NUMERIC(12, 2) NOT NULL,
    current_balance NUMERIC(12, 2) DEFAULT 0,

    -- Terms
    interest_rate NUMERIC(5, 3) NOT NULL, -- e.g., 7.750 for 7.75%
    rate_type VARCHAR(50) DEFAULT 'variable', -- 'variable', 'fixed'
    draw_period_months INT DEFAULT 120, -- typical 10 years
    repayment_period_months INT DEFAULT 240, -- typical 20 years

    -- Monthly payment
    minimum_monthly_payment NUMERIC(10, 2),
    interest_only_period BOOLEAN DEFAULT true,

    -- Equity calculation at origination
    property_value_at_open NUMERIC(12, 2),
    loan_balance_at_open NUMERIC(12, 2),
    ltv_at_open NUMERIC(5, 4), -- Combined LTV

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_heloc_property ON heloc_line(property_id);
CREATE INDEX idx_heloc_person ON heloc_line(person_id);
CREATE INDEX idx_heloc_status ON heloc_line(status);


-- Table: heloc_draw
-- Tracks individual draws from HELOC
CREATE TABLE IF NOT EXISTS heloc_draw (
    draw_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    heloc_id UUID NOT NULL REFERENCES heloc_line(heloc_id) ON DELETE CASCADE,

    -- Draw details
    draw_date DATE NOT NULL,
    draw_amount NUMERIC(12, 2) NOT NULL,
    purpose VARCHAR(255), -- 'down_payment', 'renovation', 'emergency', 'investment'

    -- If used for another property purchase
    linked_property_id UUID REFERENCES property(property_id),

    -- Terms at time of draw
    interest_rate_at_draw NUMERIC(5, 3),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_heloc_draw_heloc ON heloc_draw(heloc_id);
CREATE INDEX idx_heloc_draw_property ON heloc_draw(linked_property_id);


-- Table: purchase_scenario
-- Analyzes using HELOC equity to purchase additional properties
CREATE TABLE IF NOT EXISTS purchase_scenario (
    scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,

    -- Source property (where equity comes from)
    source_property_id UUID REFERENCES property(property_id),
    source_heloc_id UUID REFERENCES heloc_line(heloc_id),

    -- Target property (what we want to buy)
    target_purchase_price NUMERIC(12, 2) NOT NULL,
    target_address VARCHAR(500),
    target_property_type VARCHAR(100),

    -- Purchase structure
    down_payment_amount NUMERIC(12, 2) NOT NULL,
    down_payment_percent NUMERIC(5, 4) NOT NULL,
    heloc_draw_amount NUMERIC(12, 2), -- Amount from HELOC used for down payment
    cash_from_savings NUMERIC(12, 2), -- Additional cash needed

    -- New mortgage details
    new_loan_amount NUMERIC(12, 2) NOT NULL,
    new_interest_rate NUMERIC(5, 3) NOT NULL,
    new_loan_term_years INT NOT NULL,

    -- Operating projections
    expected_monthly_rent NUMERIC(10, 2),
    estimated_expenses NUMERIC(10, 2),
    monthly_mortgage_payment NUMERIC(10, 2),
    monthly_heloc_payment NUMERIC(10, 2),

    -- Closing costs
    estimated_closing_costs NUMERIC(12, 2),
    closing_cost_percent NUMERIC(5, 4),

    -- ROI calculations
    total_cash_invested NUMERIC(12, 2),
    annual_cash_flow NUMERIC(12, 2),
    cash_on_cash_return NUMERIC(10, 6),

    -- Metadata
    scenario_name VARCHAR(255),
    scenario_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_scenario_person ON purchase_scenario(person_id);
CREATE INDEX idx_purchase_scenario_source_property ON purchase_scenario(source_property_id);
CREATE INDEX idx_purchase_scenario_heloc ON purchase_scenario(source_heloc_id);


-- View: current_equity_summary
-- Shows current equity position for all properties
CREATE OR REPLACE VIEW current_equity_summary AS
SELECT
    p.property_id,
    p.person_id,
    p.address,

    -- Original purchase
    p.purchase_price as original_purchase_price,

    -- Current valuation (most recent)
    (
        SELECT market_value
        FROM property_valuation pv
        WHERE pv.property_id = p.property_id
        ORDER BY valuation_date DESC
        LIMIT 1
    ) as current_market_value,

    -- Appreciation
    (
        SELECT appreciation_amount
        FROM property_valuation pv
        WHERE pv.property_id = p.property_id
        ORDER BY valuation_date DESC
        LIMIT 1
    ) as total_appreciation,

    (
        SELECT appreciation_percent
        FROM property_valuation pv
        WHERE pv.property_id = p.property_id
        ORDER BY valuation_date DESC
        LIMIT 1
    ) as appreciation_percent,

    -- Current loan balance
    COALESCE(p.loan_amount, 0) as current_loan_balance,

    -- Equity calculation
    (
        SELECT market_value
        FROM property_valuation pv
        WHERE pv.property_id = p.property_id
        ORDER BY valuation_date DESC
        LIMIT 1
    ) - COALESCE(p.loan_amount, 0) as current_equity,

    -- Available equity for HELOC (80% LTV typical)
    (
        (
            SELECT market_value
            FROM property_valuation pv
            WHERE pv.property_id = p.property_id
            ORDER BY valuation_date DESC
            LIMIT 1
        ) * 0.80
    ) - COALESCE(p.loan_amount, 0) as available_heloc_equity,

    -- HELOC info if exists
    (
        SELECT heloc_id
        FROM heloc_line hl
        WHERE hl.property_id = p.property_id
        AND hl.status = 'active'
        LIMIT 1
    ) as active_heloc_id,

    (
        SELECT available_credit
        FROM heloc_line hl
        WHERE hl.property_id = p.property_id
        AND hl.status = 'active'
        LIMIT 1
    ) as heloc_available_credit,

    (
        SELECT current_balance
        FROM heloc_line hl
        WHERE hl.property_id = p.property_id
        AND hl.status = 'active'
        LIMIT 1
    ) as heloc_current_balance

FROM property p
WHERE p.property_id IS NOT NULL;


-- View: heloc_performance
-- Shows HELOC utilization and costs
CREATE OR REPLACE VIEW heloc_performance AS
SELECT
    hl.heloc_id,
    hl.property_id,
    hl.person_id,
    p.address,
    hl.lender_name,
    hl.status,

    -- Credit line info
    hl.max_credit_limit,
    hl.available_credit,
    hl.current_balance,

    -- Utilization
    CASE
        WHEN hl.max_credit_limit > 0
        THEN (hl.current_balance / hl.max_credit_limit)
        ELSE 0
    END as utilization_rate,

    -- Cost
    hl.interest_rate,
    hl.minimum_monthly_payment,
    (hl.current_balance * hl.interest_rate / 12) as monthly_interest_cost,
    (hl.current_balance * hl.interest_rate) as annual_interest_cost,

    -- Draw history
    (
        SELECT COUNT(*)
        FROM heloc_draw hd
        WHERE hd.heloc_id = hl.heloc_id
    ) as total_draws,

    (
        SELECT SUM(draw_amount)
        FROM heloc_draw hd
        WHERE hd.heloc_id = hl.heloc_id
    ) as total_drawn,

    hl.open_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, hl.open_date)) as years_open

FROM heloc_line hl
JOIN property p ON p.property_id = hl.property_id;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE property_valuation IS 'Tracks property market values over time for appreciation analysis';
COMMENT ON TABLE heloc_line IS 'Home Equity Lines of Credit associated with properties';
COMMENT ON TABLE heloc_draw IS 'Individual draws/advances from HELOC lines';
COMMENT ON TABLE purchase_scenario IS 'Analysis of using HELOC equity to purchase additional properties';
COMMENT ON VIEW current_equity_summary IS 'Current equity position and HELOC availability for all properties';
COMMENT ON VIEW heloc_performance IS 'HELOC utilization and cost analysis';
