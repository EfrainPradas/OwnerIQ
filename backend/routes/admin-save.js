const express = require('express');
const router = express.Router();

// POST /api/admin/save-to-tables - Save extracted data to database tables
router.post('/save-to-tables', async (req, res) => {
    try {
        const { document_id, extracted_data, document_type } = req.body;

        console.log('\n======= SAVE TO TABLES REQUEST =======');
        console.log('Document ID:', document_id);
        console.log('Document Type:', document_type);
        console.log('Fields count:', Object.keys(extracted_data || {}).length);

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get the document to find batch_id
        const { data: document } = await supabase
            .from('document_uploads')
            .select('batch_id')
            .eq('upload_id', document_id)
            .single();

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const batch_id = document.batch_id;

        // Get batch to find user_id
        const { data: batch } = await supabase
            .from('import_batches')
            .select('user_id')
            .eq('batch_id', batch_id)
            .single();

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        const user_id = batch.user_id;
        const results = { properties: null, mortgages: null, insurance: null, taxes: null };

        // Helper to get value from extracted field
        const getValue = (field) => {
            if (!field) return null;
            return field.value !== undefined ? field.value : field;
        };

        // CLOSING DOCUMENT - Creates property + mortgage
        if (document_type === 'closing_alta' || document_type === 'closing') {
            console.log('Processing as CLOSING document...');

            // 1. INSERT PROPERTY
            const propertyData = {
                user_id,
                address: getValue(extracted_data.property_address),
                city: getValue(extracted_data.city),
                state: getValue(extracted_data.state),
                zip_code: getValue(extracted_data.zip_code),
                property_type: getValue(extracted_data.property_type),
                year_built: getValue(extracted_data.construction_year),
                square_feet: getValue(extracted_data.property_sqf),
                purchase_date: getValue(extracted_data.closing_date) || getValue(extracted_data.purchase_refinance_closing_date),
                purchase_price: getValue(extracted_data.purchase_price) || getValue(extracted_data.refinance_price),
                current_value: getValue(extracted_data.purchase_price) || getValue(extracted_data.refinance_price),
                notes: `Property Address Legal: ${getValue(extracted_data.property_address_legal_description) || 'N/A'}`
            };

            console.log('Inserting property:', propertyData.address);
            const { data: property, error: propertyError } = await supabase
                .from('properties')
                .insert(propertyData)
                .select()
                .single();

            if (propertyError) {
                console.error('Property insert error:', propertyError);
                throw new Error(`Failed to insert property: ${propertyError.message}`);
            }

            results.properties = property;
            console.log('Property created:', property.property_id);

            // 2. INSERT MORTGAGE
            const mortgageData = {
                property_id: property.property_id,
                lender_name: getValue(extracted_data.lender_name) || getValue(extracted_data.lender_mortgage_name),
                loan_number: getValue(extracted_data.loan_number) || getValue(extracted_data.account_number),
                loan_amount: getValue(extracted_data.loan_amount),
                interest_rate: getValue(extracted_data.interest_rate),
                loan_term_months: (getValue(extracted_data.term_years) || 30) * 12,
                monthly_payment: getValue(extracted_data.monthly_payment_principal_interest) || getValue(extracted_data.total_monthly_payment_piti),
                start_date: getValue(extracted_data.closing_date) || getValue(extracted_data.purchase_refinance_closing_date),
                first_payment_date: getValue(extracted_data.first_payment_date),
                prepayment_penalty: getValue(extracted_data.pre_payment_penalty) === 'Yes',
                escrow_property_tax: getValue(extracted_data.escrow_property_tax),
                escrow_insurance: getValue(extracted_data.escrow_home_owner_insurance),
                notes: `Lender Contact: ${getValue(extracted_data.lender_contact_primary_name) || 'N/A'}\nEmail: ${getValue(extracted_data.lender_contact_primary_email) || 'N/A'}\nPhone: ${getValue(extracted_data.lender_contact_primary_phone) || 'N/A'}`
            };

            console.log('Inserting mortgage for loan:', mortgageData.loan_number);
            const { data: mortgage, error: mortgageError } = await supabase
                .from('mortgages')
                .insert(mortgageData)
                .select()
                .single();

            if (mortgageError) {
                console.error('Mortgage insert error:', mortgageError);
                // Don't throw - property was created successfully
            } else {
                results.mortgages = mortgage;
                console.log('Mortgage created:', mortgage.mortgage_id);
            }
        }

        // HOME OWNER INSURANCE DOCUMENT
        if (document_type === 'home_owner_insurance' || document_type === 'insurance') {
            console.log('Processing as INSURANCE document...');

            // Find property by address
            const propertyAddress = getValue(extracted_data.property_address);
            if (propertyAddress) {
                const { data: property } = await supabase
                    .from('properties')
                    .select('property_id')
                    .eq('user_id', user_id)
                    .ilike('address', `%${propertyAddress.substring(0, 20)}%`)
                    .single();

                if (property) {
                    const insuranceData = {
                        property_id: property.property_id,
                        insurance_company: getValue(extracted_data.insurance_company),
                        policy_number: getValue(extracted_data.policy_number),
                        coverage_amount: getValue(extracted_data.coverage_a_dwelling),
                        annual_premium: getValue(extracted_data.insurance_initial_premium),
                        effective_date: getValue(extracted_data.hoi_effective_date),
                        expiration_date: getValue(extracted_data.hoi_expiration_date),
                        agent_name: getValue(extracted_data.insurance_agent_name),
                        agent_phone: getValue(extracted_data.insurance_agent_phone_number),
                        agent_email: getValue(extracted_data.insurance_agent_email_address)
                    };

                    const { data: insurance, error: insuranceError } = await supabase
                        .from('insurance_policies')
                        .insert(insuranceData)
                        .select()
                        .single();

                    if (!insuranceError) {
                        results.insurance = insurance;
                        console.log('Insurance created:', insurance.policy_id);
                    }
                }
            }
        }

        // TAX BILL DOCUMENT
        if (document_type === 'tax_bill') {
            console.log('Processing as TAX BILL document...');

            const propertyAddress = getValue(extracted_data.property_address);
            if (propertyAddress) {
                const { data: property } = await supabase
                    .from('properties')
                    .select('property_id')
                    .eq('user_id', user_id)
                    .ilike('address', `%${propertyAddress.substring(0, 20)}%`)
                    .single();

                if (property) {
                    const taxData = {
                        property_id: property.property_id,
                        tax_year: new Date().getFullYear(),
                        assessed_value: getValue(extracted_data.assessed_value),
                        annual_tax_amount: getValue(extracted_data.taxes_paid_last_year),
                        tax_authority: getValue(extracted_data.tax_authority) || getValue(extracted_data.property_tax_county),
                        account_number: getValue(extracted_data.account_number)
                    };

                    const { data: tax, error: taxError } = await supabase
                        .from('property_taxes')
                        .insert(taxData)
                        .select()
                        .single();

                    if (!taxError) {
                        results.taxes = tax;
                        console.log('Tax record created:', tax.tax_id);
                    }
                }
            }
        }

        console.log('Save to tables completed successfully');
        res.json({
            success: true,
            message: 'Data saved to database tables',
            results
        });

    } catch (error) {
        console.error('Error saving to tables:', error);
        res.status(500).json({
            error: 'Failed to save data',
            details: error.message
        });
    }
});

module.exports = router;
