// Simple test to diagnose the admin process-document endpoint issue
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    console.log('🔍 Testing admin/process-document flow...\n');

    // Step 1: Get a document
    console.log('Step 1: Fetching a document...');
    const { data: docs, error: docsError } = await supabase
        .from('document_uploads')
        .select('*')
        .eq('upload_status', 'PROCESSING')
        .limit(1);

    if (docsError) {
        console.error('Error fetching documents:', docsError);
        return;
    }

    if (!docs || docs.length === 0) {
        console.log('❌ No documents with PROCESSING status found');
        console.log('Looking for any document...');

        const { data: anyDocs } = await supabase
            .from('document_uploads')
            .select('*')
            .limit(3);

        console.log('Found documents:', anyDocs?.map(d => ({
            id: d.upload_id,
            status: d.upload_status,
            filename: d.filename
        })));
        return;
    }

    const document = docs[0];
    console.log('✅ Found document:', {
        id: document.upload_id,
        filename: document.filename,
        path: document.file_path,
        status: document.upload_status
    });

    // Step 2: Try to download from storage
    console.log('\nStep 2: Downloading from storage...');
    const { data: fileData, error: storageError } = await supabase
        .storage
        .from('property-documents')
        .download(document.file_path);

    if (storageError) {
        console.error('❌ Storage error:', storageError);
        return;
    }

    console.log('✅ File downloaded, size:', fileData.size, 'bytes');

    // Step 3: Check if AI pipeline exists
    console.log('\nStep 3: Checking AI pipeline...');
    try {
        const DocumentPipeline = require('./ai-pipeline');
        console.log('✅ AI Pipeline module loaded');

        const pipeline = new DocumentPipeline();
        console.log('✅ Pipeline instance created');

    } catch (aiError) {
        console.error('❌ AI Pipeline error:', aiError.message);
    }

    console.log('\n✅ All checks passed! The issue might be in the actual AI processing.');
    console.log('Suggested next steps:');
    console.log('1. Check OpenAI API key is valid');
    console.log('2. Check you have OpenAI credits');
    console.log('3. Try processing a smaller/simpler PDF');
}

test().then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
}).catch(err => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
});
