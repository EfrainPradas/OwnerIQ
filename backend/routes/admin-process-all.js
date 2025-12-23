const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const DocumentPipeline = require('../ai-pipeline');
const AdminProcessEventLogger = require('../utils/AdminProcessEventLogger');

const pipeline = new DocumentPipeline();
const eventLogger = new AdminProcessEventLogger();

// POST /api/admin/process-all - Process all documents in a batch automatically
router.post('/process-all', async (req, res) => {
    const { batch_id } = req.body;

    console.log('\n======= PROCESS ALL AUTO REQUEST =======');
    console.log('🚀 PROCESS-ALL ENDPOINT v2.0 - WITH ONBOARDING LOGIC');
    console.log('Batch ID:', batch_id);

    if (!batch_id) {
        return res.status(400).json({ error: 'batch_id is required' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Get all documents in batch that need processing
        const { data: documents, error: docsError } = await supabase
            .from('document_uploads')
            .select('*')
            .eq('batch_id', batch_id)
            .in('upload_status', ['UPLOADED', 'PROCESSING']);

        if (docsError) {
            console.error('Error fetching documents:', docsError);
            return res.status(500).json({ error: 'Failed to fetch documents' });
        }

        if (!documents || documents.length === 0) {
            return res.json({
                success: true,
                message: 'No documents to process',
                results: []
            });
        }

        console.log(`Found ${documents.length} documents to process`);

        // Get batch user_id
        const { data: batch } = await supabase
            .from('import_batches')
            .select('user_id')
            .eq('batch_id', batch_id)
            .single();

        const user_id = batch?.user_id;

        // Check if user already has properties
        const { data: existingProperties } = await supabase
            .from('property')
            .select('property_id')
            .eq('person_id', user_id)
            .limit(1);

        const hasPrimaryResidence = (existingProperties && existingProperties.length === 0);
        console.log(`📋 User has existing properties: ${!hasPrimaryResidence}`);
        console.log(`📋 Will mark first property as PRIMARY: ${hasPrimaryResidence}`);

        // Log batch processing started
        await eventLogger.logBatchProcessingStarted(batch_id, user_id, documents.length);

        // STEP 1: Process ALL documents with AI first
        console.log('\n📄 STEP 1: Processing all documents with AI...');
        const processedDocuments = [];

        for (let i = 0; i < documents.length; i++) {
            const document = documents[i];
            console.log(`  Processing ${i + 1}/${documents.length}: ${document.filename}`);

            try {
                // Download file
                const { data: fileData, error: storageError } = await supabase
                    .storage
                    .from('property-documents')
                    .download(document.file_path);

                if (storageError) {
                    console.error('  ❌ Storage error:', storageError);
                    await eventLogger.logDocumentFailed(batch_id, user_id, document.upload_id, storageError);
                    continue;
                }

                // Save to temp file
                const buffer = Buffer.from(await fileData.arrayBuffer());
                const tempPath = path.join(os.tmpdir(), `auto_${Date.now()}_${document.filename}`);
                fs.writeFileSync(tempPath, buffer);

                // Process with AI
                const aiResult = await pipeline.process(tempPath, {
                    metadata: {
                        batch_id: document.batch_id,
                        original_filename: document.original_filename,
                        auto_processing: true
                    }
                });

                // Update document status
                await supabase
                    .from('document_uploads')
                    .update({
                        upload_status: 'PROCESSED',
                        document_type: aiResult.document_type,
                        extracted_data: aiResult.extracted_data,
                        extraction_confidence: aiResult.extraction_confidence
                    })
                    .eq('upload_id', document.upload_id);

                // Cleanup
                fs.unlinkSync(tempPath);

                processedDocuments.push({
                    document_id: document.upload_id,
                    filename: document.filename,
                    document_type: aiResult.document_type,
                    extracted_data: aiResult.extracted_data
                });

                console.log(`  ✅ Processed: ${aiResult.document_type}`);

                // Log successful document processing
                await eventLogger.logDocumentProcessed(
                    batch_id,
                    user_id,
                    document.upload_id,
                    aiResult.document_type,
                    Object.keys(aiResult.extracted_data || {}).length
                );

            } catch (error) {
                console.error(`  ❌ Error processing ${document.filename}:`, error);
                await eventLogger.logDocumentFailed(batch_id, user_id, document.upload_id, error);
            }
        }

        console.log(`\n✅ AI Processing complete: ${processedDocuments.length}/${documents.length} documents`);

        // STEP 2: Consolidate all extracted data into ONE property
        console.log('\n🔗 STEP 2: Consolidating data from all documents...');
        await eventLogger.logDataConsolidationStarted(batch_id, user_id, processedDocuments.length);

        const consolidatedData = consolidateData(processedDocuments);

        await eventLogger.logDataConsolidated(batch_id, user_id, Object.keys(consolidatedData).length);

        // STEP 3: Save to database as ONE property
        console.log('\n💾 STEP 3: Saving consolidated property to database...');
        const tableResults = await saveToTables(supabase, {
            user_id,
            extracted_data: consolidatedData,
            is_primary_residence: hasPrimaryResidence
        });

        console.log('✅ Property saved successfully');

        // Log property creation
        if (tableResults.properties) {
            await eventLogger.logPropertyCreated(
                batch_id,
                user_id,
                tableResults.properties.property_id,
                tableResults.properties.address,
                hasPrimaryResidence
            );
        }

        // STEP 4: Update batch status to COMPLETED
        console.log('\n📌 STEP 4: Updating batch status...');
        console.log('  Batch ID:', batch_id);

        const { data: updateResult, error: updateError } = await supabase
            .from('import_batches')
            .update({
                status: 'COMPLETED'
            })
            .eq('batch_id', batch_id)
            .select();

        if (updateError) {
            console.error('❌ Failed to update batch status:', updateError);
        } else {
            console.log('✅ Batch status updated to COMPLETED');
            console.log('  Updated record:', updateResult);
            await eventLogger.logBatchStatusUpdated(batch_id, user_id, 'COMPLETED');
        }

        res.json({
            success: true,
            batch_id,
            message: `Processed ${processedDocuments.length} documents successfully`,
            results: processedDocuments.map(doc => ({
                document_id: doc.document_id,
                filename: doc.filename,
                success: true,
                document_type: doc.document_type
            })),
            property_created: !!tableResults.properties,
            table_results: tableResults
        });

        // Log batch processing completed
        await eventLogger.logBatchProcessingCompleted(
            batch_id,
            user_id,
            processedDocuments.length,
            !!tableResults.properties
        );

    } catch (error) {
        console.error('❌ Error in batch processing:', error);

        // Log batch processing failed
        const batch_id_for_error = req.body.batch_id;
        const { data: batch } = await supabase
            .from('import_batches')
            .select('user_id')
            .eq('batch_id', batch_id_for_error)
            .single();

        if (batch) {
            await eventLogger.logBatchProcessingFailed(batch_id_for_error, batch.user_id, error);
        }

        res.status(500).json({
            error: 'Failed to process batch',
            details: error.message
        });
    }
});

// Helper function to consolidate data from multiple documents
function consolidateData(processedDocuments) {
    const consolidated = {};

    console.log(`  Consolidating ${processedDocuments.length} documents...`);

    // Merge all extracted_data objects
    // Later documents will override earlier ones if same field exists
    for (const doc of processedDocuments) {
        if (doc.extracted_data) {
            Object.assign(consolidated, doc.extracted_data);
            console.log(`    - Merged data from ${doc.document_type || 'unknown'}`);
        }
    }

    console.log(`  ✅ Consolidated ${Object.keys(consolidated).length} unique fields`);
    return consolidated;
}

// Helper function to save extracted data to tables
async function saveToTables(supabase, { document_id, user_id, extracted_data, document_type, is_primary_residence = false }) {
    const results = { properties: null, mortgages: null, insurance: null, taxes: null };

    const getValue = (field) => {
        if (!field) return null;
        return field.value !== undefined ? field.value : field;
    };

    try {
        console.log(`\n🔍 saveToTables called for document: ${document_id}`);
        console.log(`   User ID: ${user_id}`);
        console.log(`   Document Type: ${document_type}`);
        console.log(`   Extracted Data Keys:`, Object.keys(extracted_data || {}));

        // Check if we have enough data to create a property (at minimum, address)
        const hasAddress = getValue(extracted_data.property_address) || getValue(extracted_data.address);

        if (hasAddress) {
            console.log(`✅ Document has address data - will attempt to save property`);

            // FIRST: Ensure person exists (person_id is FK to person table)
            const { data: existingPerson } = await supabase
                .from('person')
                .select('person_id')
                .eq('person_id', user_id)
                .single();

            if (!existingPerson) {
                console.log('📝 Person not found, creating person record first...');

                // Build person data with all required NOT NULL fields
                const personData = {
                    person_id: user_id,
                    legal_type: 'individual',  // default to individual
                    full_name: getValue(extracted_data.borrower_name) || getValue(extracted_data.owner_name) || 'Unknown Owner',
                    status: 'active',
                    notes: {}  // empty jsonb object
                };

                const { data: newPerson, error: personError } = await supabase
                    .from('person')
                    .insert(personData)
                    .select()
                    .single();

                if (personError) {
                    console.error('❌ Failed to create person:', personError);
                    console.log('⚠️ Skipping property insert due to person creation failure');
                    return results;  // Exit early, don't try to insert property
                } else {
                    console.log('✅ Person created successfully');
                }
            } else {
                console.log('✅ Person already exists');
            }


            // 1. INSERT PROPERTY (works for any document type that has address)
            const propertyData = {
                person_id: user_id,  // person_id is NOT NULL, maps to user_id
                address: getValue(extracted_data.property_address) || getValue(extracted_data.address),
                city: getValue(extracted_data.city),
                state: getValue(extracted_data.state),
                zip_code: getValue(extracted_data.zip_code) || getValue(extracted_data.zip),
                county: getValue(extracted_data.county),
                property_type: getValue(extracted_data.property_type) || 'residential',
                legal_description: getValue(extracted_data.legal_description),
                property_sqf: getValue(extracted_data.property_sqf) || getValue(extracted_data.square_feet),
                construction_year: getValue(extracted_data.construction_year) || getValue(extracted_data.year_built),
                purchase_price: getValue(extracted_data.purchase_price),
                refinance_price: getValue(extracted_data.refinance_price),
                purchase_refinance_closing_date: getValue(extracted_data.closing_date) || getValue(extracted_data.purchase_refinance_closing_date),
                closing_date: getValue(extracted_data.closing_date),
                valuation: getValue(extracted_data.purchase_price) || getValue(extracted_data.refinance_price) || getValue(extracted_data.property_value),
                assessed_value: getValue(extracted_data.assessed_value),
                loan_amount: getValue(extracted_data.loan_amount),
                loan_number: getValue(extracted_data.loan_number),
                loan_rate: getValue(extracted_data.interest_rate) || getValue(extracted_data.loan_rate),
                loan_term: getValue(extracted_data.term_years) || getValue(extracted_data.loan_term),
                interest_rate: getValue(extracted_data.interest_rate),
                term_years: getValue(extracted_data.term_years),
                monthly_payment: getValue(extracted_data.monthly_payment) || getValue(extracted_data.monthly_payment_principal_interest),
                borrower_name: getValue(extracted_data.borrower_name),
                lender_name: getValue(extracted_data.lender_name) || getValue(extracted_data.lender_mortgage_name),
                rent: getValue(extracted_data.rent) || getValue(extracted_data.monthly_rent),
                taxes: getValue(extracted_data.taxes) || getValue(extracted_data.annual_property_tax),
                insurance: getValue(extracted_data.insurance) || getValue(extracted_data.annual_premium),
                hoa: getValue(extracted_data.hoa) || getValue(extracted_data.hoa_fee),
                is_primary_residence: is_primary_residence  // Mark as primary based on onboarding
            };

            // Remove null/undefined values to avoid inserting them, EXCEPT is_primary_residence (false is valid)
            Object.keys(propertyData).forEach(key => {
                if (key !== 'is_primary_residence' && (propertyData[key] === null || propertyData[key] === undefined)) {
                    delete propertyData[key];
                }
            });

            console.log('📝 Property data to prepare:', JSON.stringify(propertyData, null, 2));

            // Check if property with this address already exists for this user
            // Normalize address for comparison (remove spaces, uppercase)
            const normalizedAddress = propertyData.address?.toUpperCase().replace(/\s+/g, '');

            const { data: existingProperties, error: searchError } = await supabase
                .from('property')
                .select('property_id, address')
                .eq('person_id', user_id);

            let existingProperty = null;
            if (existingProperties && existingProperties.length > 0) {
                // Find matching property by normalized address
                existingProperty = existingProperties.find(p => {
                    const existingNormalized = p.address?.toUpperCase().replace(/\s+/g, '');
                    return existingNormalized === normalizedAddress;
                });
            }

            let property;
            if (existingProperty) {
                // UPDATE existing property
                console.log(`🔄 Updating existing property: ${existingProperty.property_id}`);
                const { data: updatedProperty, error: updateError } = await supabase
                    .from('property')
                    .update(propertyData)
                    .eq('property_id', existingProperty.property_id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('❌ Property update error:', updateError);
                } else {
                    console.log('✅ Property updated successfully');
                    property = updatedProperty;
                }
            } else {
                // INSERT new property
                console.log('➕ Inserting new property');
                const { data: newProperty, error: propertyError } = await supabase
                    .from('property')
                    .insert(propertyData)
                    .select()
                    .single();

                if (propertyError) {
                    console.error('❌ Property insert error:', propertyError);
                } else {
                    console.log('✅ Property inserted successfully:', newProperty.property_id);
                    property = newProperty;
                }
            }

            if (property) {
                results.properties = property;

                // 2. INSERT MORTGAGE (only if we have loan data)
                const hasLoanData = getValue(extracted_data.loan_amount) || getValue(extracted_data.loan_number);

                if (hasLoanData) {
                    const mortgageData = {
                        property_id: property.property_id,
                        lender_name: getValue(extracted_data.lender_name) || getValue(extracted_data.lender_mortgage_name),
                        loan_number: getValue(extracted_data.loan_number),
                        loan_amount: getValue(extracted_data.loan_amount),
                        interest_rate: getValue(extracted_data.interest_rate) || getValue(extracted_data.loan_rate),
                        loan_term_months: (getValue(extracted_data.term_years) || getValue(extracted_data.loan_term) || 30) * 12,
                        monthly_payment: getValue(extracted_data.monthly_payment_principal_interest) || getValue(extracted_data.monthly_payment),
                        start_date: getValue(extracted_data.closing_date) || getValue(extracted_data.loan_start_date),
                        first_payment_date: getValue(extracted_data.first_payment_date)
                    };

                    console.log('📝 Mortgage data to insert:', JSON.stringify(mortgageData, null, 2));

                    const { data: mortgage, error: mortgageError } = await supabase
                        .from('mortgages')
                        .insert(mortgageData)
                        .select()
                        .single();

                    if (mortgageError) {
                        console.error('❌ Mortgage insert error:', mortgageError);
                    } else {
                        console.log('✅ Mortgage inserted successfully');
                        results.mortgages = mortgage;
                    }
                }
            }
        } else {
            console.log(`⚠️ Document has no address data - skipping property save`);
        }
    } catch (error) {
        console.error('❌ Error saving to tables:', error);
    }

    return results;
}

module.exports = router;
