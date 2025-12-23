require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUpdate() {
    const batch_id = '97c7cb7a-35f0-46ca-a993-d19d10bfd6b1';

    console.log('Testing batch update...');
    console.log('Batch ID:', batch_id);

    const { data, error } = await supabase
        .from('import_batches')
        .update({
            status: 'COMPLETED'
        })
        .eq('batch_id', batch_id)
        .select();

    console.log('\nResult:');
    console.log('Data:', data);
    console.log('Error:', error);

    if (error) {
        console.log('\nFull error:', JSON.stringify(error, null, 2));
    }
}

testUpdate();
