require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTableStructure() {
    console.log('Testing document_uploads table...\n');

    // Get first row to see columns
    const { data, error } = await supabase
        .from('document_uploads')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Columns in document_uploads:');
    if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log('No data in table, trying to describe via RPC...');
    }

    // Try inserting test data
    console.log('\nTrying test insert...');
    const { data: insertData, error: insertError } = await supabase
        .from('document_uploads')
        .insert({
            user_id: 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a',
            batch_id: 'test-batch',
            doc_type_id: 'closing',
            filename: 'test.pdf',
            original_filename: 'test.pdf',
            file_path: 'test/path.pdf',
            file_size_bytes: 1024,
            mime_type: 'application/pdf',
            upload_status: 'PENDING'
        })
        .select();

    if (insertError) {
        console.error('Insert Error:', insertError);
        console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
        console.log('Insert SUCCESS!', insertData);

        // Delete test row
        await supabase
            .from('document_uploads')
            .delete()
            .eq('upload_id', insertData[0].upload_id);
        console.log('Test row deleted');
    }
}

testTableStructure().then(() => process.exit());
