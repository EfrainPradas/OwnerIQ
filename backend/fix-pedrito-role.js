require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixPedritoRole() {
  console.log('🔧 Fixing Pedrito Perez tenant role...\n');

  const personId = 'cd4467c6-c132-40aa-a9d7-22baaeb0fbf5';
  const ownerId = 'db731feb-cbf5-40ae-916e-4ce20f23d70e';

  // Check if role already exists
  const { data: existingRole, error: checkError } = await supabase
    .from('person_role')
    .select('*')
    .eq('person_id', personId)
    .eq('role', 'tenant');

  if (checkError) {
    console.error('❌ Error checking existing role:', checkError.message);
    process.exit(1);
  }

  if (existingRole && existingRole.length > 0) {
    console.log('✅ Role already exists for Pedrito Perez');
    console.log(existingRole);
    process.exit(0);
  }

  // Create the tenant role
  const { data, error } = await supabase
    .from('person_role')
    .insert({
      person_id: personId,
      owner_person_id: ownerId,
      role: 'tenant',
      context: 'property',
      context_id: null,
      active_from: '2025-10-09'
    })
    .select();

  if (error) {
    console.error('❌ Error creating role:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }

  console.log('✅ Successfully created tenant role for Pedrito Perez');
  console.log(data);
  process.exit(0);
}

fixPedritoRole().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});