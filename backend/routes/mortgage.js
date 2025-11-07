/**
 * API Routes for Mortgage Calculator
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');
const {
  calculateMonthlyPayment,
  calculatePITI,
  generateAmortizationSchedule,
  calculateBalanceAtYear,
  calculateYearlySummary
} = require('../utils/mortgage-calculator');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * POST /api/mortgage/calculate-payment
 * Calculate monthly mortgage payment
 */
router.post('/calculate-payment', authenticateToken(supabase), async (req, res) => {
  try {
    const { loanAmount, annualInterestRate, termYears } = req.body;

    if (!loanAmount || !annualInterestRate || !termYears) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['loanAmount', 'annualInterestRate', 'termYears']
      });
    }

    const monthlyPayment = calculateMonthlyPayment(
      parseFloat(loanAmount),
      parseFloat(annualInterestRate),
      parseInt(termYears)
    );

    res.json({ monthlyPayment });

  } catch (error) {
    console.error('Error calculating monthly payment:', error);
    res.status(500).json({
      error: 'Failed to calculate monthly payment',
      message: error.message
    });
  }
});

/**
 * POST /api/mortgage/calculate-piti
 * Calculate PITI payment
 */
router.post('/calculate-piti', authenticateToken(supabase), async (req, res) => {
  try {
    const {
      monthlyPaymentPI,
      yearlyPropertyTaxes,
      yearlyHOI,
      monthlyPMI
    } = req.body;

    if (!monthlyPaymentPI) {
      return res.status(400).json({
        error: 'Missing required field: monthlyPaymentPI'
      });
    }

    const piti = calculatePITI(
      parseFloat(monthlyPaymentPI),
      parseFloat(yearlyPropertyTaxes) || 0,
      parseFloat(yearlyHOI) || 0,
      parseFloat(monthlyPMI) || 0
    );

    res.json({ piti });

  } catch (error) {
    console.error('Error calculating PITI:', error);
    res.status(500).json({
      error: 'Failed to calculate PITI',
      message: error.message
    });
  }
});

/**
 * POST /api/mortgage/generate-schedule
 * Generate complete amortization schedule and save to database
 */
router.post('/generate-schedule', authenticateToken(supabase), async (req, res) => {
  try {
    const {
      propertyId,
      loanAmount,
      annualInterestRate,
      termYears,
      firstPaymentDate,
      homeValue,
      yearlyPropertyTaxes,
      yearlyHOI,
      monthlyPMI,
      taxBracket
    } = req.body;

    // Validate required fields
    if (!propertyId || !loanAmount || !annualInterestRate || !termYears || !firstPaymentDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['propertyId', 'loanAmount', 'annualInterestRate', 'termYears', 'firstPaymentDate']
      });
    }

    console.log(`📊 Generating amortization schedule for property ${propertyId}...`);

    // Generate schedule
    const { schedule, summary } = generateAmortizationSchedule({
      loanAmount: parseFloat(loanAmount),
      annualInterestRate: parseFloat(annualInterestRate),
      termYears: parseInt(termYears),
      firstPaymentDate: new Date(firstPaymentDate),
      homeValue: homeValue ? parseFloat(homeValue) : null,
      taxBracket: taxBracket ? parseFloat(taxBracket) : 0.15
    });

    // Calculate PITI
    const monthlyPaymentPITI = calculatePITI(
      summary.monthly_payment_pi,
      parseFloat(yearlyPropertyTaxes) || 0,
      parseFloat(yearlyHOI) || 0,
      parseFloat(monthlyPMI) || 0
    );

    // Delete existing schedule for this property
    const { error: deleteError } = await supabase
      .from('mortgage_payment_schedule')
      .delete()
      .eq('property_id', propertyId);

    if (deleteError) {
      console.error('Error deleting old schedule:', deleteError);
      // Continue anyway - might not exist
    }

    // Insert schedule into database in batches (Supabase has limits)
    const batchSize = 100;
    const scheduleWithPropertyId = schedule.map((payment, index) => {
      // Exclude extra_payments and payment_id fields
      const { extra_payments, payment_id, ...paymentWithoutExtra } = payment;

      // Generate deterministic UUID based on propertyId and payment_number
      // This allows idempotent inserts (same input = same UUID)
      const hash = crypto.createHash('sha256');
      hash.update(`${propertyId}-${payment.payment_number}`);
      const hexHash = hash.digest('hex');
      // Convert first 32 hex chars to UUID format
      const generatedPaymentId = [
        hexHash.substring(0, 8),
        hexHash.substring(8, 12),
        hexHash.substring(12, 16),
        hexHash.substring(16, 20),
        hexHash.substring(20, 32)
      ].join('-');

      const mappedPayment = {
        property_id: propertyId,
        payment_id: generatedPaymentId,
        ...paymentWithoutExtra
      };

      // Debug first payment
      if (index === 0) {
        console.log('🔍 First payment mapping:', {
          property_id: propertyId,
          payment_number: payment.payment_number,
          generated_payment_id: generatedPaymentId
        });
      }

      return mappedPayment;
    });

    for (let i = 0; i < scheduleWithPropertyId.length; i += batchSize) {
      const batch = scheduleWithPropertyId.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('mortgage_payment_schedule')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        throw insertError;
      }

      console.log(`✅ Inserted payments ${i + 1} to ${Math.min(i + batchSize, scheduleWithPropertyId.length)}`);
    }

    // Save or update summary
    const summaryData = {
      property_id: propertyId,
      loan_amount: summary.loan_amount,
      interest_rate: summary.interest_rate,
      term_years: summary.term_years,
      first_payment_date: summary.first_payment_date.toISOString().split('T')[0],
      monthly_payment_pi: summary.monthly_payment_pi,
      monthly_payment_piti: monthlyPaymentPITI,
      home_value: summary.home_value,
      yearly_property_taxes: parseFloat(yearlyPropertyTaxes) || 0,
      yearly_hoi: parseFloat(yearlyHOI) || 0,
      monthly_pmi: parseFloat(monthlyPMI) || 0,
      total_payments: summary.total_payments,
      total_interest: summary.total_interest,
      total_principal: summary.total_principal,
      tax_bracket: summary.tax_bracket,
      total_tax_returned: summary.total_tax_returned,
      effective_interest_rate: summary.effective_interest_rate
    };

    const { data: summaryResult, error: summaryError } = await supabase
      .from('mortgage_summary')
      .upsert(summaryData, { onConflict: 'property_id' })
      .select()
      .single();

    if (summaryError) {
      console.error('Error saving summary:', summaryError);
      throw summaryError;
    }

    console.log(`✅ Amortization schedule generated: ${schedule.length} payments`);

    res.json({
      success: true,
      message: 'Amortization schedule generated successfully',
      paymentsGenerated: schedule.length,
      summary: summaryResult
    });

  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({
      error: 'Failed to generate amortization schedule',
      message: error.message
    });
  }
});

/**
 * GET /api/mortgage/schedule/:propertyId
 * Get amortization schedule for a property
 */
router.get('/schedule/:propertyId', authenticateToken(supabase), async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { year, limit } = req.query;

    let query = supabase
      .from('mortgage_payment_schedule')
      .select('*')
      .eq('property_id', propertyId)
      .order('payment_number', { ascending: true });

    // Filter by year if provided
    if (year) {
      query = query.eq('payment_year', parseInt(year));
    }

    // Limit results if provided
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching schedule:', error);
      return res.status(500).json({
        error: 'Failed to fetch amortization schedule',
        details: error.message
      });
    }

    res.json(data || []);

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/mortgage/summary/:propertyId
 * Get mortgage summary for a property
 */
router.get('/summary/:propertyId', authenticateToken(supabase), async (req, res) => {
  try {
    const { propertyId } = req.params;
    console.log(`🔍 Fetching mortgage summary for property: ${propertyId}`);

    const { data, error } = await supabase
      .from('mortgage_summary')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    console.log('📊 Query result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.log(`⚠️ No mortgage summary found for property ${propertyId}`);
        return res.status(404).json({
          error: 'Mortgage summary not found for this property'
        });
      }

      console.error('❌ Error fetching summary:', error);
      return res.status(500).json({
        error: 'Failed to fetch mortgage summary',
        details: error.message
      });
    }

    console.log(`✅ Mortgage summary found for property ${propertyId}`);
    res.json(data);

  } catch (error) {
    console.error('❌ Error fetching summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/mortgage/yearly-summary/:propertyId
 * Get yearly summary of mortgage payments
 */
router.get('/yearly-summary/:propertyId', authenticateToken(supabase), async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Get all payments
    const { data: schedule, error } = await supabase
      .from('mortgage_payment_schedule')
      .select('*')
      .eq('property_id', propertyId)
      .order('payment_number', { ascending: true });

    if (error) {
      console.error('Error fetching schedule:', error);
      return res.status(500).json({
        error: 'Failed to fetch schedule',
        details: error.message
      });
    }

    if (!schedule || schedule.length === 0) {
      return res.status(404).json({
        error: 'No amortization schedule found for this property'
      });
    }

    // Calculate yearly summary
    const yearlySummary = calculateYearlySummary(schedule);

    res.json(yearlySummary);

  } catch (error) {
    console.error('Error calculating yearly summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/mortgage/schedule/:propertyId
 * Delete amortization schedule for a property
 */
router.delete('/schedule/:propertyId', authenticateToken(supabase), async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Delete schedule
    const { error: scheduleError } = await supabase
      .from('mortgage_payment_schedule')
      .delete()
      .eq('property_id', propertyId);

    if (scheduleError) {
      console.error('Error deleting schedule:', scheduleError);
      throw scheduleError;
    }

    // Delete summary
    const { error: summaryError } = await supabase
      .from('mortgage_summary')
      .delete()
      .eq('property_id', propertyId);

    if (summaryError) {
      console.error('Error deleting summary:', summaryError);
      throw summaryError;
    }

    console.log(`✅ Deleted mortgage data for property ${propertyId}`);

    res.json({
      success: true,
      message: 'Mortgage data deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting mortgage data:', error);
    res.status(500).json({
      error: 'Failed to delete mortgage data',
      message: error.message
    });
  }
});

module.exports = router;
