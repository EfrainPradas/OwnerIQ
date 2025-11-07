require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function cleanOrphanAddresses() {
  console.log('🧹 Cleaning orphan addresses with null valid_from...\n');

  // Find addresses with null valid_from
  const { data: orphanAddresses, error: findError } = await supabase
    .from('person_address')
    .select('*')
    .is('valid_from', null);

  if (findError) {
    console.error('❌ Error finding orphan addresses:', findError.message);
    process.exit(1);
  }

  if (!orphanAddresses || orphanAddresses.length === 0) {
    console.log('✅ No orphan addresses found');
    process.exit(0);
  }

  console.log(`Found ${orphanAddresses.length} orphan address(es):`);
  orphanAddresses.forEach(addr => {
    console.log(`  - Address ID: ${addr.person_address_id}, Person ID: ${addr.person_id}, Line1: ${addr.line1}`);
  });

  // Update them with current date
  const now = new Date().toISOString().split('T')[0];
  const { data: updated, error: updateError } = await supabase
    .from('person_address')
    .update({ valid_from: now })
    .is('valid_from', null)
    .select();

  if (updateError) {
    console.error('❌ Error updating addresses:', updateError.message);
    process.exit(1);
  }

  console.log(`\n✅ Successfully updated ${updated.length} address(es) with valid_from = ${now}`);
  process.exit(0);
}

cleanOrphanAddresses().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});