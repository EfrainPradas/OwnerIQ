// Simple test to diagnose the admin process-document endpoint issue
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    console.log('Testing admin/process-document flow...');

    // Step 1: Get a document
    console.log('Step 1: Fetching a document...');
    const result = await supabase
        .from('document_uploads')
        .select('*')
        .eq('upload_status', 'PROCESSING')
        .limit(1);

    if (result.error) {
        console.error('Error fetching documents:', result.error);
        return;
    }

    if (!result.data || result.data.length === 0) {
        console.log('No documents with PROCESSING status found');
        console.log('Looking for any document...');

        const anyResult = await supabase
            .from('document_uploads')
            .select('*')
            .limit(3);

        console.log('Found documents:');
        if (anyResult.data) {
            anyResult.data.forEach(d => {
                console.log(`  - ${d.filename} (${d.upload_status})`);
            });
        }
        return;
    }

    const document = result.data[0];
    console.log('Found document:', document.filename);
    console.log('File path:', document.file_path);
    console.log('Status:', document.upload_status);

    // Step 2: Try to download from storage
    console.log('\nStep 2: Downloading from storage...');
    const downloadResult = await supabase
        .storage
        .from('property-documents')
        .download(document.file_path);

    if (downloadResult.error) {
        console.error('Storage error:', downloadResult.error);
        return;
    }

    console.log('File downloaded, size:', downloadResult.data.size, 'bytes');

    console.log('\nTest complete - basic flow works!');
}

test();
