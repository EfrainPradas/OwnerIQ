require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTable() {
  console.log('🔍 Checking mortgage_payment_schedule table structure...\n');
  
  // Try to insert a single test row
  const testData = {
    property_id: 'df2af813-3e12-4c41-9be0-d849b6bb2f46',
    payment_number: 999,
    payment_date: '2024-06-01',
    payment_year: 1,
    interest_rate: 0.075,
    interest_due: 1000.00,
    payment_due: 1125.74,
    principal_paid: 125.74,
    balance: 160000.00
  };
  
  const { data, error } = await supabase
    .from('mortgage_payment_schedule')
    .insert(testData)
    .select();
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Test row inserted successfully:', data);
    
    // Delete test row
    await supabase
      .from('mortgage_payment_schedule')
      .delete()
      .eq('payment_number', 999);
    console.log('✅ Test row deleted');
  }
}

checkTable();
