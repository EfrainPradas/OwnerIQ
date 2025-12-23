require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const test = async () => {
    console.log('Simulating admin/process-document endpoint...\n');

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get first PROCESSING document
    console.log('1. Fetching document...');
    const { data: docs } = await supabase
        .from('document_uploads')
        .select('*')
        .eq('upload_status', 'PROCESSING')
        .limit(1);

    if (!docs || docs.length === 0) {
        console.log('No PROCESSING documents found');
        return;
    }

    const document = docs[0];
    console.log('Found:', document.filename);

    // Download file
    console.log('\n2. Downloading from storage...');
    const { data: fileData, error: storageError } = await supabase
        .storage
        .from('property-documents')
        .download(document.file_path);

    if (storageError) {
        console.log('Storage error:', storageError);
        return;
    }

    console.log('Downloaded:', fileData.size, 'bytes');

    // Save to temp file
    console.log('\n3. Saving to temp file...');
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `test_${Date.now()}_${document.filename}`);
    fs.writeFileSync(tempFilePath, buffer);
    console.log('Saved to:', tempFilePath);

    // Try to load DocumentPipeline
    console.log('\n4. Loading AI Pipeline...');
    try {
        const DocumentPipeline = require('./ai-pipeline');
        const pipeline = new DocumentPipeline();
        console.log('Pipeline loaded successfully');

        // Try to process
        console.log('\n5. Processing with AI...');
        const result = await pipeline.process(tempFilePath, {
            metadata: {
                batch_id: document.batch_id,
                original_filename: document.original_filename,
                admin_processing: true
            }
        });

        console.log('\nSUCCESS!');
        console.log('Document type:', result.document_type);
        console.log('Confidence:', result.extraction_confidence);
        console.log('Fields extracted:', Object.keys(result.extracted_data || {}).length);

        // Cleanup
        fs.unlinkSync(tempFilePath);
        console.log('\nTemp file cleaned up');

    } catch (error) {
        console.log('\nERROR during AI processing:');
        console.log('Message:', error.message);
        console.log('Stack:', error.stack);

        // Cleanup on error
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};

test();
