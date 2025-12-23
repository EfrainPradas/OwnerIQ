require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    console.log('Probando inserción en document_uploads...\n');

    const testData = {
        user_id: 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a',
        batch_id: 'test-batch-123',
        doc_type_id: 'closing',
        filename: 'test.pdf',
        original_filename: 'test.pdf',
        file_path: 'test/path.pdf',
        file_size_bytes: 1024,
        mime_type: 'application/pdf',
        upload_status: 'PENDING'
    };

    console.log('Datos a insertar:', testData);

    const result = await supabase
        .from('document_uploads')
        .insert(testData)
        .select();

    console.log('\nResultado:');
    console.log('Data:', result.data);
    console.log('Error:', result.error);

    if (result.error) {
        console.log('\nError detallado:');
        console.log(JSON.stringify(result.error, null, 2));
    }
}

test();
