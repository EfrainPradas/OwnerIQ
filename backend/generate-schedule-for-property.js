require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { generateAmortizationSchedule, calculatePITI } = require('./utils/mortgage-calculator');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

async function generateSchedule() {
  const propertyId = 'df2af813-3e12-4c41-9be0-d849b6bb2f46';

  console.log('📊 Generating amortization schedule...\n');

  try {
    // Generate the schedule
    const { schedule, summary } = generateAmortizationSchedule({
      loanAmount: 161000,
      annualInterestRate: 0.075,
      termYears: 30,
      firstPaymentDate: new Date('2024-06-01'),
      homeValue: 238000,
      taxBracket: 0.15
    });

    console.log(`✅ Schedule generated: ${schedule.length} payments`);
    console.log(`   Monthly P&I: $${summary.monthly_payment_pi}`);
    console.log(`   Total Interest: $${summary.total_interest.toLocaleString()}`);
    console.log(`   Total Payments: $${summary.total_payments.toLocaleString()}\n`);

    // Calculate PITI
    const monthlyPaymentPITI = calculatePITI(
      summary.monthly_payment_pi,
      335.92, // taxes
      42.83,  // insurance
      0       // PMI
    );

    console.log('🗑️  Deleting any existing schedule...');
    const { error: deleteError } = await supabase
      .from('mortgage_payment_schedule')
      .delete()
      .eq('property_id', propertyId);

    if (deleteError) {
      console.error('Error deleting old schedule:', deleteError);
    } else {
      console.log('✅ Old schedule deleted\n');
    }

    // Insert schedule in batches
    console.log('💾 Inserting schedule in batches...');
    const batchSize = 100;
    for (let i = 0; i < schedule.length; i += batchSize) {
      const batch = schedule.slice(i, i + batchSize).map(payment => {
        // Remove extra_payments field as it may not exist in the table
        // Add payment_id explicitly since DEFAULT may not be working
        const { extra_payments, ...paymentData } = payment;
        return {
          payment_id: generateUUID(),
          property_id: propertyId,
          ...paymentData
        };
      });

      const { error: insertError } = await supabase
        .from('mortgage_payment_schedule')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
        throw insertError;
      }

      console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(schedule.length / batchSize)} inserted`);
    }

    console.log('\n💾 Saving summary...');

    // Delete old summary if exists
    await supabase
      .from('mortgage_summary')
      .delete()
      .eq('property_id', propertyId);

    // Insert new summary
    const { error: summaryError } = await supabase
      .from('mortgage_summary')
      .insert({
        summary_id: generateUUID(),
        property_id: propertyId,
        loan_amount: 161000,
        interest_rate: 0.075,
        term_years: 30,
        first_payment_date: '2024-06-01',
        monthly_payment_pi: summary.monthly_payment_pi,
        monthly_payment_piti: monthlyPaymentPITI,
        home_value: 238000,
        yearly_property_taxes: 335.92,
        yearly_hoi: 42.83,
        monthly_pmi: 0,
        total_payments: summary.total_payments,
        total_interest: summary.total_interest,
        total_principal: summary.total_principal,
        tax_bracket: 0.15,
        total_tax_returned: summary.total_tax_returned,
        effective_interest_rate: summary.effective_interest_rate
      });

    if (summaryError) {
      console.error('❌ Error saving summary:', summaryError);
      throw summaryError;
    }

    console.log('✅ Summary saved\n');

    console.log('🎉 SUCCESS! Amortization schedule generated successfully!');
    console.log('\n🎯 Now you can view it:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Navigate to Properties');
    console.log('3. Click on "131 Redwood Track Course"');
    console.log('4. The Mortgage Calculator will appear with all data!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateSchedule();
