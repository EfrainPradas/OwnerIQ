/**
 * HELOC & Equity Management Routes
 * Handles Home Equity Lines of Credit, property valuations, and leverage strategies
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// PROPERTY VALUATIONS
// ============================================================================

/**
 * GET /api/heloc/valuations/:propertyId
 * Get all valuations for a property
 */
router.get('/valuations/:propertyId', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;

        const { data, error } = await supabase
            .from('property_valuation')
            .select('*')
            .eq('property_id', propertyId)
            .eq('person_id', userId)
            .order('valuation_date', { ascending: false });

        if (error) throw error;

        res.json({ valuations: data || [] });
    } catch (error) {
        console.error('Error fetching valuations:', error);
        res.status(500).json({ error: 'Failed to fetch valuations', details: error.message });
    }
});

/**
 * POST /api/heloc/valuations
 * Add a new property valuation
 */
router.post('/valuations', async (req, res) => {
    try {
        const userId = req.user?.id;
        const {
            property_id,
            valuation_date,
            market_value,
            valuation_source,
            original_purchase_price,
            notes
        } = req.body;

        // Validate required fields
        if (!property_id || !valuation_date || !market_value) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['property_id', 'valuation_date', 'market_value']
            });
        }

        const { data, error } = await supabase
            .from('property_valuation')
            .insert({
                property_id,
                person_id: userId,
                valuation_date,
                market_value: parseFloat(market_value),
                valuation_source: valuation_source || 'manual',
                original_purchase_price: original_purchase_price ? parseFloat(original_purchase_price) : null,
                notes
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, valuation: data });
    } catch (error) {
        console.error('Error creating valuation:', error);
        res.status(500).json({ error: 'Failed to create valuation', details: error.message });
    }
});

/**
 * GET /api/heloc/equity-summary
 * Get current equity summary for all user's properties
 */
router.get('/equity-summary', async (req, res) => {
    console.log('📊 GET /api/heloc/equity-summary - userId:', req.user?.id);
    try {
        const userId = req.user?.id;

        if (!userId) {
            console.log('❌ No userId found');
            return res.status(401).json({ error: 'Not authenticated' });
        }

        console.log('🔍 Querying current_equity_summary for person_id:', userId);
        const { data, error } = await supabase
            .from('current_equity_summary')
            .select('*')
            .eq('person_id', userId);

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        console.log('✅ Equity summary found:', data?.length || 0, 'items');
        res.json({ summary: data || [] });
    } catch (error) {
        console.error('❌ Error fetching equity summary:', error);
        res.status(500).json({ error: 'Failed to fetch equity summary', details: error.message });
    }
});

// ============================================================================
// HELOC LINES
// ============================================================================

/**
 * GET /api/heloc/lines
 * Get all HELOC lines for the user
 */
router.get('/lines', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { status } = req.query; // Filter by status if provided

        let query = supabase
            .from('heloc_line')
            .select(`
                *,
                property:property_id (
                    address,
                    purchase_price,
                    loan_amount
                )
            `)
            .eq('person_id', userId)
            .order('open_date', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ heloc_lines: data || [] });
    } catch (error) {
        console.error('Error fetching HELOC lines:', error);
        res.status(500).json({ error: 'Failed to fetch HELOC lines', details: error.message });
    }
});

/**
 * POST /api/heloc/lines
 * Create a new HELOC line
 */
router.post('/lines', async (req, res) => {
    try {
        const userId = req.user?.id;
        const {
            property_id,
            lender_name,
            account_number,
            open_date,
            max_credit_limit,
            available_credit,
            current_balance,
            interest_rate,
            rate_type,
            draw_period_months,
            repayment_period_months,
            minimum_monthly_payment,
            interest_only_period,
            property_value_at_open,
            loan_balance_at_open,
            notes
        } = req.body;

        // Validate required fields
        if (!property_id || !open_date || !max_credit_limit || !interest_rate) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['property_id', 'open_date', 'max_credit_limit', 'interest_rate']
            });
        }

        // Calculate LTV if values provided
        let ltv_at_open = null;
        if (property_value_at_open && loan_balance_at_open) {
            ltv_at_open = (parseFloat(loan_balance_at_open) + parseFloat(current_balance || 0)) / parseFloat(property_value_at_open);
        }

        const { data, error } = await supabase
            .from('heloc_line')
            .insert({
                property_id,
                person_id: userId,
                lender_name,
                account_number,
                open_date,
                status: 'active',
                max_credit_limit: parseFloat(max_credit_limit),
                available_credit: parseFloat(available_credit || max_credit_limit),
                current_balance: parseFloat(current_balance || 0),
                interest_rate: parseFloat(interest_rate),
                rate_type: rate_type || 'variable',
                draw_period_months: parseInt(draw_period_months || 120),
                repayment_period_months: parseInt(repayment_period_months || 240),
                minimum_monthly_payment: minimum_monthly_payment ? parseFloat(minimum_monthly_payment) : null,
                interest_only_period: interest_only_period !== false,
                property_value_at_open: property_value_at_open ? parseFloat(property_value_at_open) : null,
                loan_balance_at_open: loan_balance_at_open ? parseFloat(loan_balance_at_open) : null,
                ltv_at_open,
                notes
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, heloc: data });
    } catch (error) {
        console.error('Error creating HELOC line:', error);
        res.status(500).json({ error: 'Failed to create HELOC line', details: error.message });
    }
});

/**
 * PUT /api/heloc/lines/:helocId
 * Update HELOC line information
 */
router.put('/lines/:helocId', async (req, res) => {
    try {
        const { helocId } = req.params;
        const userId = req.user?.id;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.heloc_id;
        delete updates.person_id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('heloc_line')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('heloc_id', helocId)
            .eq('person_id', userId)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'HELOC line not found' });
        }

        res.json({ success: true, heloc: data });
    } catch (error) {
        console.error('Error updating HELOC line:', error);
        res.status(500).json({ error: 'Failed to update HELOC line', details: error.message });
    }
});

// ============================================================================
// HELOC DRAWS
// ============================================================================

/**
 * GET /api/heloc/draws/:helocId
 * Get all draws for a HELOC line
 */
router.get('/draws/:helocId', async (req, res) => {
    try {
        const { helocId } = req.params;

        const { data, error } = await supabase
            .from('heloc_draw')
            .select(`
                *,
                linked_property:linked_property_id (
                    property_address
                )
            `)
            .eq('heloc_id', helocId)
            .order('draw_date', { ascending: false });

        if (error) throw error;

        res.json({ draws: data || [] });
    } catch (error) {
        console.error('Error fetching HELOC draws:', error);
        res.status(500).json({ error: 'Failed to fetch draws', details: error.message });
    }
});

/**
 * POST /api/heloc/draws
 * Record a new HELOC draw
 */
router.post('/draws', async (req, res) => {
    try {
        const {
            heloc_id,
            draw_date,
            draw_amount,
            purpose,
            linked_property_id,
            interest_rate_at_draw,
            notes
        } = req.body;

        // Validate required fields
        if (!heloc_id || !draw_date || !draw_amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['heloc_id', 'draw_date', 'draw_amount']
            });
        }

        // Start transaction: insert draw and update HELOC balance
        const { data: draw, error: drawError } = await supabase
            .from('heloc_draw')
            .insert({
                heloc_id,
                draw_date,
                draw_amount: parseFloat(draw_amount),
                purpose,
                linked_property_id,
                interest_rate_at_draw: interest_rate_at_draw ? parseFloat(interest_rate_at_draw) : null,
                notes
            })
            .select()
            .single();

        if (drawError) throw drawError;

        // Update HELOC line balance and available credit
        const { data: heloc, error: helocError } = await supabase
            .from('heloc_line')
            .select('current_balance, available_credit')
            .eq('heloc_id', heloc_id)
            .single();

        if (helocError) throw helocError;

        const newBalance = parseFloat(heloc.current_balance) + parseFloat(draw_amount);
        const newAvailable = parseFloat(heloc.available_credit) - parseFloat(draw_amount);

        const { error: updateError } = await supabase
            .from('heloc_line')
            .update({
                current_balance: newBalance,
                available_credit: Math.max(0, newAvailable),
                updated_at: new Date().toISOString()
            })
            .eq('heloc_id', heloc_id);

        if (updateError) throw updateError;

        res.json({ success: true, draw });
    } catch (error) {
        console.error('Error recording HELOC draw:', error);
        res.status(500).json({ error: 'Failed to record draw', details: error.message });
    }
});

// ============================================================================
// PURCHASE SCENARIOS
// ============================================================================

/**
 * GET /api/heloc/scenarios
 * Get all purchase scenarios for the user
 */
router.get('/scenarios', async (req, res) => {
    try {
        const userId = req.user?.id;

        const { data, error } = await supabase
            .from('purchase_scenario')
            .select(`
                *,
                source_property:source_property_id (
                    address
                ),
                source_heloc:source_heloc_id (
                    lender_name,
                    available_credit
                )
            `)
            .eq('person_id', userId)
            .order('scenario_date', { ascending: false });

        if (error) throw error;

        res.json({ scenarios: data || [] });
    } catch (error) {
        console.error('Error fetching scenarios:', error);
        res.status(500).json({ error: 'Failed to fetch scenarios', details: error.message });
    }
});

/**
 * POST /api/heloc/scenarios
 * Create a new purchase scenario analysis
 */
router.post('/scenarios', async (req, res) => {
    try {
        const userId = req.user?.id;
        const scenario = req.body;

        // Validate required fields
        if (!scenario.target_purchase_price || !scenario.down_payment_amount || !scenario.new_loan_amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['target_purchase_price', 'down_payment_amount', 'new_loan_amount']
            });
        }

        // Calculate derived values
        const downPaymentPercent = parseFloat(scenario.down_payment_amount) / parseFloat(scenario.target_purchase_price);

        const totalCashInvested = parseFloat(scenario.cash_from_savings || 0) +
                                 parseFloat(scenario.estimated_closing_costs || 0);

        // Calculate annual cash flow
        const annualRent = parseFloat(scenario.expected_monthly_rent || 0) * 12;
        const annualExpenses = parseFloat(scenario.estimated_expenses || 0) * 12;
        const annualMortgage = parseFloat(scenario.monthly_mortgage_payment || 0) * 12;
        const annualHeloc = parseFloat(scenario.monthly_heloc_payment || 0) * 12;
        const annualCashFlow = annualRent - annualExpenses - annualMortgage - annualHeloc;

        // Calculate Cash-on-Cash return
        const cocReturn = totalCashInvested > 0 ? annualCashFlow / totalCashInvested : 0;

        const { data, error } = await supabase
            .from('purchase_scenario')
            .insert({
                person_id: userId,
                ...scenario,
                down_payment_percent: downPaymentPercent,
                total_cash_invested: totalCashInvested,
                annual_cash_flow: annualCashFlow,
                cash_on_cash_return: cocReturn,
                scenario_date: scenario.scenario_date || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, scenario: data });
    } catch (error) {
        console.error('Error creating scenario:', error);
        res.status(500).json({ error: 'Failed to create scenario', details: error.message });
    }
});

/**
 * POST /api/heloc/calculate
 * Calculate HELOC metrics and purchase feasibility
 */
router.post('/calculate', async (req, res) => {
    try {
        const {
            property_value,
            current_loan_balance,
            purchase_price,
            down_payment_percent,
            heloc_interest_rate,
            new_mortgage_rate,
            new_mortgage_term_years,
            monthly_rent,
            monthly_expenses,
            closing_cost_percent
        } = req.body;

        // Calculate available equity (80% LTV typical)
        const maxLTV = 0.80;
        const maxLoanAmount = property_value * maxLTV;
        const availableEquity = maxLoanAmount - current_loan_balance;

        // Calculate purchase structure
        const targetPrice = purchase_price;
        const downPayment = targetPrice * down_payment_percent;
        const newLoanAmount = targetPrice - downPayment;
        const closingCosts = targetPrice * (closing_cost_percent || 0.04);

        // Can we use HELOC for down payment?
        const helocForDownPayment = Math.min(downPayment, availableEquity);
        const cashNeeded = downPayment - helocForDownPayment + closingCosts;

        // Calculate monthly payments
        const monthlyRate = new_mortgage_rate / 12;
        const numPayments = new_mortgage_term_years * 12;
        const mortgagePayment = newLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                               (Math.pow(1 + monthlyRate, numPayments) - 1);

        const helocMonthlyInterest = (helocForDownPayment * heloc_interest_rate) / 12;

        // Calculate returns
        const totalMonthlyPayment = mortgagePayment + helocMonthlyInterest + monthly_expenses;
        const monthlyCashFlow = monthly_rent - totalMonthlyPayment;
        const annualCashFlow = monthlyCashFlow * 12;
        const cashOnCashReturn = cashNeeded > 0 ? annualCashFlow / cashNeeded : Infinity;

        res.json({
            equity_analysis: {
                property_value,
                current_loan_balance,
                current_equity: property_value - current_loan_balance,
                max_ltv: maxLTV,
                max_loan_amount: maxLoanAmount,
                available_heloc_equity: availableEquity
            },
            purchase_structure: {
                target_purchase_price: targetPrice,
                down_payment: downPayment,
                down_payment_percent,
                new_loan_amount: newLoanAmount,
                closing_costs: closingCosts,
                heloc_draw_amount: helocForDownPayment,
                cash_from_savings: Math.max(0, cashNeeded),
                total_cash_invested: Math.max(0, cashNeeded)
            },
            monthly_payments: {
                mortgage_payment: mortgagePayment,
                heloc_interest: helocMonthlyInterest,
                operating_expenses: monthly_expenses,
                total_payment: totalMonthlyPayment,
                expected_rent: monthly_rent,
                monthly_cash_flow: monthlyCashFlow
            },
            returns: {
                annual_cash_flow: annualCashFlow,
                cash_on_cash_return: cashOnCashReturn,
                cash_on_cash_percent: (cashOnCashReturn * 100).toFixed(2) + '%'
            },
            feasibility: {
                can_use_heloc: helocForDownPayment > 0,
                heloc_covers_down_payment: helocForDownPayment >= downPayment,
                positive_cash_flow: monthlyCashFlow > 0
            }
        });

    } catch (error) {
        console.error('Error calculating HELOC scenario:', error);
        res.status(500).json({ error: 'Calculation failed', details: error.message });
    }
});

/**
 * GET /api/heloc/performance
 * Get HELOC performance metrics
 */
router.get('/performance', async (req, res) => {
    try {
        const userId = req.user?.id;

        const { data, error } = await supabase
            .from('heloc_performance')
            .select('*')
            .eq('person_id', userId);

        if (error) throw error;

        res.json({ helocs: data || [] });
    } catch (error) {
        console.error('Error fetching HELOC performance:', error);
        res.status(500).json({ error: 'Failed to fetch performance data', details: error.message });
    }
});

module.exports = router;
