require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function diagnoseTables() {
  console.log('🔍 Diagnosing database tables...\n');

  const tablesToCheck = [
    'person',
    'person_contact',
    'person_address',
    'person_role',
    'property',
    'property_tenancy',
    'property_loan',
    'property_valuation',
    'property_rent_estimate',
    'property_operating_inputs',
    'property_metrics'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ERROR - ${error.message} (code: ${error.code})`);
        if (error.hint) {
          console.log(`   Hint: ${error.hint}`);
        }
      } else {
        console.log(`✅ ${table}: OK (${count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: EXCEPTION - ${err.message}`);
    }
  }

  console.log('\n🔍 Testing specific queries...\n');

  // Test property query
  try {
    const { data, error } = await supabase
      .from('property')
      .select('property_id, person_id, address')
      .limit(1);
    
    if (error) {
      console.log(`❌ Property query: ${error.message}`);
    } else {
      console.log(`✅ Property query: OK (found ${data?.length || 0} properties)`);
    }
  } catch (err) {
    console.log(`❌ Property query exception: ${err.message}`);
  }

  // Test property_tenancy query
  try {
    const { data, error } = await supabase
      .from('property_tenancy')
      .select('tenancy_id, person_id, property_id')
      .limit(1);
    
    if (error) {
      console.log(`❌ Property tenancy query: ${error.message}`);
      console.log(`   Code: ${error.code}, Details: ${error.details}`);
    } else {
      console.log(`✅ Property tenancy query: OK (found ${data?.length || 0} tenancies)`);
    }
  } catch (err) {
    console.log(`❌ Property tenancy query exception: ${err.message}`);
  }

  console.log('\n✅ Diagnosis complete!');
  process.exit(0);
}

diagnoseTables().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});