require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createTestProperty() {
  console.log('🏠 Creating test property with mortgage data...\n');

  // Datos basados en el Excel que analizamos
  const propertyData = {
    // Basic info
    address: '131 Redwood Track Course',
    city: 'Ocala',
    state: 'FL',
    zip_code: '34472',
    property_type: 'residential',

    // Valuation
    valuation: 238000,
    purchase_price: 230000,

    // Mortgage data (CRITICAL for Mortgage Calculator)
    loan_amount: 161000,
    interest_rate: 0.075, // 7.5%
    term_years: 30,
    first_payment_date: '2024-06-01',

    // Monthly payments
    monthly_payment_principal_interest: 1125.74,
    monthly_payment: 1125.74,

    // Taxes and insurance (yearly)
    taxes: 335.92,
    insurance: 42.83,

    // PITI
    total_monthly_payment_piti: 1504.49,

    // Owner
    owner_name: 'KISSIMMEE LUXURY VACATIONS',
    borrower_name: 'KISSIMMEE LUXURY VACATIONS',

    // Set person_id to your user ID
    person_id: 'db731feb-cbf5-40ae-916e-4ce20f23d70e'
  };

  try {
    // Create property
    const { data: property, error } = await supabase
      .from('property')
      .insert(propertyData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating property:', error);
      return;
    }

    console.log('✅ Property created successfully!');
    console.log(`   Property ID: ${property.property_id}`);
    console.log(`   Address: ${property.address}, ${property.city}`);
    console.log(`   Loan Amount: $${property.loan_amount.toLocaleString()}`);
    console.log(`   Interest Rate: ${(property.interest_rate * 100).toFixed(2)}%`);
    console.log(`   Term: ${property.term_years} years`);
    console.log(`   Monthly P&I: $${property.monthly_payment_principal_interest}`);
    console.log(`   First Payment: ${property.first_payment_date}`);
    console.log('');

    console.log('⏳ Waiting 2 seconds for backend to process...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if schedule was generated
    const { data: schedule, error: scheduleError } = await supabase
      .from('mortgage_payment_schedule')
      .select('payment_id, payment_number, payment_date, interest_due, principal_paid, balance')
      .eq('property_id', property.property_id)
      .order('payment_number', { ascending: true })
      .limit(5);

    if (scheduleError) {
      console.error('❌ Error checking schedule:', scheduleError);
    } else if (!schedule || schedule.length === 0) {
      console.log('⚠️  Amortization schedule NOT generated automatically');
      console.log('   This is expected if the backend property creation doesn\'t include');
      console.log('   the automatic schedule generation code yet.');
      console.log('');
      console.log('   You can generate it manually by calling:');
      console.log(`   POST /api/mortgage/generate-schedule`);
      console.log(`   with property_id: ${property.property_id}`);
    } else {
      console.log(`✅ Amortization schedule generated: ${schedule.length} payments (showing first 5):`);
      schedule.forEach(payment => {
        console.log(`   Payment #${payment.payment_number}: ${payment.payment_date}`);
        console.log(`     Interest: $${payment.interest_due}, Principal: $${payment.principal_paid}, Balance: $${payment.balance}`);
      });
    }

    console.log('');
    console.log('🎯 Now you can view the Mortgage Calculator:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Navigate to Properties');
    console.log('3. Click on "131 Redwood Track Course"');
    console.log('4. The Mortgage Calculator will appear with Summary, Schedule, and Charts tabs');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestProperty();
