require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixPedritoRole() {
  console.log('🔧 Fixing Pedrito Perez tenant role to correct person_id...\n');

  const oldPersonId = 'cd4467c6-c132-40aa-a9d7-22baaeb0fbf5'; // Old, doesn't exist in person table
  const newPersonId = '6add3938-defd-42f1-8b86-63d4b47e00d6'; // New, correct person_id
  const ownerId = 'db731feb-cbf5-40ae-916e-4ce20f23d70e';

  // Delete the old role
  console.log('Deleting old role...');
  const { error: deleteError } = await supabase
    .from('person_role')
    .delete()
    .eq('person_id', oldPersonId);

  if (deleteError) {
    console.error('❌ Error deleting old role:', deleteError.message);
  } else {
    console.log('✅ Old role deleted');
  }

  // Check if new role already exists
  const { data: existingRole, error: checkError } = await supabase
    .from('person_role')
    .select('*')
    .eq('person_id', newPersonId)
    .eq('role', 'tenant');

  if (checkError) {
    console.error('❌ Error checking existing role:', checkError.message);
    process.exit(1);
  }

  if (existingRole && existingRole.length > 0) {
    console.log('✅ Role already exists for correct person_id');
    console.log(existingRole);
    process.exit(0);
  }

  // Create the new role
  console.log('Creating new role for correct person_id...');
  const { data, error } = await supabase
    .from('person_role')
    .insert({
      person_id: newPersonId,
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

  console.log('✅ Successfully created tenant role for correct Pedrito Perez');
  console.log(data);
  
  // Try to delete the orphan person record
  console.log('\nCleaning up orphan person record...');
  const { error: deletePersonError } = await supabase
    .from('person')
    .delete()
    .eq('person_id', oldPersonId);
    
  if (deletePersonError) {
    console.log('Note: Could not delete orphan person record (may not exist)');
  } else {
    console.log('✅ Orphan person record cleaned up');
  }
  
  process.exit(0);
}

fixPedritoRole().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});