const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const DocumentPipeline = require('../ai-pipeline');

const pipeline = new DocumentPipeline();

// GET /api/admin/test-ai - Simple test endpoint to verify AI pipeline works
router.get('/test-ai', async (req, res) => {
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        log('=== AI PIPELINE TEST ===');

        log('Checking environment variables...');
        log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET (' + process.env.SUPABASE_URL.substring(0, 30) + '...)' : 'MISSING'}`);
        log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'MISSING'}`);

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        log('1. Fetching first document...');
        const { data: docs } = await supabase
            .from('document_uploads')
            .select('*')
            .limit(1);

        if (!docs || docs.length === 0) {
            return res.json({ success: false, error: 'No documents found', logs });
        }

        const doc = docs[0];
        log(`2. Found: ${doc.filename}`);

        log('3. Downloading from storage...');
        const { data: fileData, error: storageError } = await supabase
            .storage
            .from('property-documents')
            .download(doc.file_path);

        if (storageError) {
            return res.json({ success: false, error: 'Storage error', details: storageError, logs });
        }

        log(`4. Downloaded: ${fileData.size} bytes`);

        log('5. Saving to temp file...');
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const tempPath = path.join(os.tmpdir(), `test_${Date.now()}.pdf`);
        fs.writeFileSync(tempPath, buffer);
        log(`6. Saved to: ${tempPath}`);

        log('7. Testing DocumentPipeline instance...');
        log(`   Pipeline exists: ${!!pipeline}`);
        log(`   Pipeline.process exists: ${typeof pipeline.process}`);

        log('8. Calling pipeline.process()...');
        const result = await pipeline.process(tempPath, {
            metadata: { test: true }
        });

        log('9. SUCCESS! AI processing worked');
        log(`   Type: ${result.document_type}`);
        log(`   Confidence: ${result.extraction_confidence}`);

        // Cleanup
        fs.unlinkSync(tempPath);
        log('10. Temp file cleaned up');

        res.json({
            success: true,
            message: 'AI Pipeline works!',
            result: {
                document_type: result.document_type,
                confidence: result.extraction_confidence,
                fields_count: Object.keys(result.extracted_data || {}).length
            },
            logs
        });

    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(`Stack: ${error.stack}`);

        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            logs
        });
    }
});

// POST /api/admin/process-document - Process a document with AI manually
router.post('/process-document', async (req, res) => {
    console.log('\n======= ADMIN PROCESS DOCUMENT REQUEST =======');
    try {
        const { document_id } = req.body;
        console.log('1. Document ID received:', document_id);

        if (!document_id) {
            console.log('ERROR: No document_id provided');
            return res.status(400).json({ error: 'document_id is required' });
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        console.log('2. Supabase client created');

        // 1. Get document info
        console.log('3. Fetching document from database...');
        const { data: document, error: docError } = await supabase
            .from('document_uploads')
            .select('*')
            .eq('upload_id', document_id)
            .single();

        if (docError || !document) {
            console.log('ERROR: Document not found:', docError);
            return res.status(404).json({ error: 'Document not found' });
        }
        console.log('4. Document found:', document.filename);

        // 2. Download file from Storage
        console.log('5. Downloading file from storage:', document.file_path);
        const { data: fileData, error: storageError } = await supabase
            .storage
            .from('property-documents')
            .download(document.file_path);

        if (storageError) {
            console.log('ERROR: Storage download failed:', storageError);
            return res.status(500).json({ error: 'Failed to download file from storage', details: storageError });
        }
        console.log('6. File downloaded, size:', fileData.size);

        // 3. Save to temp file
        console.log('7. Saving to temp file...');
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `admin_${Date.now()}_${document.filename}`);
        fs.writeFileSync(tempFilePath, buffer);
        console.log('8. Temp file created:', tempFilePath);

        try {
            console.log('9. Starting AI Pipeline processing...');

            // 4. Update status to PROCESSING
            console.log('10. Updating status to PROCESSING...');
            await supabase
                .from('document_uploads')
                .update({ upload_status: 'PROCESSING' })
                .eq('upload_id', document_id);

            // 5. Process with AI
            console.log('11. Calling pipeline.process()...');
            const result = await pipeline.process(tempFilePath, {
                metadata: {
                    batch_id: document.batch_id,
                    original_filename: document.original_filename,
                    admin_processing: true
                }
            });

            console.log('12. AI Extraction complete!');
            console.log('    Type:', result.document_type);
            console.log('    Confidence:', result.extraction_confidence);

            // 6. Update document with results
            await supabase
                .from('document_uploads')
                .update({
                    upload_status: 'PROCESSED',
                    extracted_data: result.extracted_data,
                    ai_confidence: result.extraction_confidence || 0.95,
                    validation_errors: result.validation ? result.validation.errors : null,
                    processed_at: new Date().toISOString()
                })
                .eq('upload_id', document_id);

            // 7. Clean up temp file
            fs.unlinkSync(tempFilePath);

            res.json({
                success: true,
                message: 'Document processed successfully',
                extracted_data: result.extracted_data,
                document_type: result.document_type,
                confidence: result.extraction_confidence
            });

        } catch (aiError) {
            console.error('❌ AI Processing Error:', aiError);

            // Update status to FAILED
            await supabase
                .from('document_uploads')
                .update({
                    upload_status: 'FAILED',
                    validation_errors: { error: aiError.message },
                    processed_at: new Date().toISOString()
                })
                .eq('upload_id', document_id);

            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            throw aiError;
        }

    } catch (error) {
        console.error('❌ Error in admin document processing:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to process document',
            details: error.message
        });
    }
});

module.exports = router;
