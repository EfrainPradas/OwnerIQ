require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkProperties() {
  console.log('🔍 Checking for properties with mortgage data...\n');

  // Get properties with mortgage data
  const { data: properties, error } = await supabase
    .from('property')
    .select('property_id, address, city, loan_amount, interest_rate, term_years, first_payment_date')
    .not('loan_amount', 'is', null)
    .not('interest_rate', 'is', null);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('❌ No properties found with mortgage data.');
    console.log('\nTo see the Mortgage Calculator, you need to:');
    console.log('1. Create a property with loan_amount, interest_rate, term_years, and first_payment_date');
    console.log('2. Or use the Bulk Upload feature with mortgage documents');
    return;
  }

  console.log(`✅ Found ${properties.length} properties with mortgage data:\n`);

  properties.forEach((prop, index) => {
    console.log(`${index + 1}. ${prop.address || 'No address'}, ${prop.city || ''}`);
    console.log(`   Property ID: ${prop.property_id}`);
    console.log(`   Loan Amount: $${prop.loan_amount ? prop.loan_amount.toLocaleString() : 'N/A'}`);
    console.log(`   Interest Rate: ${prop.interest_rate ? (prop.interest_rate * 100).toFixed(2) + '%' : 'N/A'}`);
    console.log(`   Term: ${prop.term_years || 'N/A'} years`);
    console.log(`   First Payment: ${prop.first_payment_date || 'N/A'}`);
    console.log('');
  });

  // Check if schedules have been generated
  console.log('📊 Checking if amortization schedules exist...\n');

  for (const prop of properties) {
    const { data: schedule, error: scheduleError } = await supabase
      .from('mortgage_payment_schedule')
      .select('payment_id')
      .eq('property_id', prop.property_id)
      .limit(1);

    if (scheduleError) {
      console.log(`   ❌ Error checking schedule for ${prop.address}: ${scheduleError.message}`);
    } else if (schedule && schedule.length > 0) {
      console.log(`   ✅ ${prop.address || prop.property_id}: Schedule EXISTS`);
    } else {
      console.log(`   ⚠️  ${prop.address || prop.property_id}: Schedule NOT GENERATED (will be created when property is viewed)`);
    }
  }

  console.log('\n🎯 To view the Mortgage Calculator:');
  console.log('1. Go to http://localhost:3000');
  console.log('2. Navigate to Properties');
  console.log('3. Click on one of the properties listed above');
  console.log('4. The Mortgage Calculator will appear below the Property Scorecard');
}

checkProperties();
