const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OnboardingEventLogger = require('../utils/OnboardingEventLogger');

// Middleware to check if user is demo user
const isDemoUser = (req) => {
  return req.headers['x-demo-mode'] === 'true' ||
    (req.user && req.user.id === 'dummy-id');
};

// Helper function to parse numeric values safely
const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

// GET /api/onboarding/profile - Get or create user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    console.log('🔍 Onboarding profile request - isDemoUser:', isDemoUser(req));
    console.log('🔍 User ID from token:', req.user?.id);
    const userId = isDemoUser(req) ? null : req.user.id;
    console.log('🔍 Looking for profile with userId:', userId);

    const { createClient } = require('@supabase/supabase-js');
    const scopedSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers['authorization']
          }
        }
      }
    );

    // Use scoped client for query
    let query = (isDemoUser(req) ? supabase : scopedSupabase)
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId);

    if (isDemoUser(req)) {
      query = supabase.from('user_profiles').select('*').is('user_id', null);
    }

    const { data: profile, error } = await query.maybeSingle();
    console.log('🔍 Profile found:', !!profile, 'Error:', !!error);
    if (profile) {
      console.log('🔍 Profile data:', JSON.stringify(profile, null, 2));
    }

    if (error) throw error;

    // Create profile if doesn't exist (for both demo and regular users)
    if (!profile) {
      console.log('🔍 Creating profile for userId:', userId);

      const insertClient = isDemoUser(req) ? supabase : scopedSupabase;

      const { data: newProfile, error: createError } = await insertClient
        .from('user_profiles')
        .insert({
          user_id: userId,
          owner_name: isDemoUser(req) ? 'Demo User' : '',
          owner_email: isDemoUser(req) ? 'demo@owneriq.com' : '',
          owner_phone: isDemoUser(req) ? '555-0123' : '',
          user_type: 'HOMEOWNER',
          has_primary_residence: false,
          investment_property_count: 0,
          onboarding_status: 'INCOMPLETE',
          current_step: 1
        })
        .select()
        .single();

      if (createError) {
        // If we hit a race condition or primary key conflict, it means profile exists
        if (createError.code === '23505') { // Postgres duplicate key error code
          console.log('⚠️ Profile created concurrently, fetching existing record...');
          const { data: existingProfile, error: fetchError } = await insertClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (fetchError) throw fetchError;
          return res.json(existingProfile);
        }

        console.error('🔍 Error creating profile:', createError);
        throw createError;
      }
      console.log('🔍 Profile created successfully');

      // Log profile creation
      const eventLogger = new OnboardingEventLogger(scopedSupabase);
      await eventLogger.logProfileCreated(userId, {
        owner_name: newProfile.owner_name,
        user_type: newProfile.user_type
      });

      return res.json(newProfile);
    }

    console.log('🔍 Returning existing profile');
    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    const fs = require('fs');
    fs.appendFileSync('error.log', `${new Date().toISOString()} - GET Profile Error: ${error.message}\n${error.stack}\nDetails: ${JSON.stringify(error)}\n\n`);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const DocumentPipeline = require('../ai-pipeline'); // Import the AI pipeline
const pipeline = new DocumentPipeline();

// ... (other imports)

// POST /api/onboarding/profile - Update user profile
router.post('/profile', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const {
      owner_name,
      owner_email,
      owner_phone,
      user_type,
      has_primary_residence,
      investment_property_count,
      onboarding_status,
      current_step
    } = req.body;

    console.log(`📝 Update profile for ${userId || 'demo'}:`, { owner_email, user_type });

    // Build update object only with provided fields
    const updates = {
      updated_at: new Date().toISOString()
    };

    // Only add fields if they are defined AND, importantly, not null.
    // We treat null as "do not update" to respect database constraints.
    if (owner_name !== undefined && owner_name !== null) updates.owner_name = owner_name.trim();
    if (owner_email !== undefined && owner_email !== null) updates.owner_email = owner_email.trim().toLowerCase();
    if (owner_phone !== undefined && owner_phone !== null) updates.owner_phone = owner_phone.trim();
    if (user_type !== undefined && user_type !== null) updates.user_type = user_type;

    // Boolean and Number fields - check for undefined/null but allow internal falsy values (like 0 or false) if valid.
    if (has_primary_residence !== undefined && has_primary_residence !== null) updates.has_primary_residence = has_primary_residence;

    // Parse numeric fields safely. If parseNumeric returns null/NaN, DO NOT update the field.
    if (investment_property_count !== undefined && investment_property_count !== null) {
      const parsedInv = parseNumeric(investment_property_count);
      if (!isNaN(parsedInv)) updates.investment_property_count = parsedInv;
    }

    if (onboarding_status !== undefined && onboarding_status !== null) updates.onboarding_status = onboarding_status;

    if (current_step !== undefined && current_step !== null) {
      const parsedStep = parseNumeric(current_step);
      if (!isNaN(parsedStep)) updates.current_step = parsedStep;
    }

    console.log(`📝 Update profile for ${userId || 'demo'}:`, updates);

    // Use the global admin supabase client for profile updates to avoid RLS issues with custom claims
    // or simply use the existing authenticated client strategy if that was the intent.
    // However, creating a new client on every request is expensive and prone to env issues.
    // Let's rely on the service_role client if we are admin, or the user's token.

    // For now, let's try using the existing 'supabase' client from locals which is the ADMIN/SERVICE client 
    // IF it was initialized with service role key (usually it's ANON key).
    // If it's ANON, it won't work for UPSERT if RLS blocks it unless we have the user's JWT.

    // Debugging RLS client creation:
    // console.log('Auth Header:', req.headers['authorization'] ? 'Present' : 'Missing');
    // console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');

    const scopedSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers['authorization']
          }
        }
      }
    );

    let query;
    if (isDemoUser(req)) {
      query = scopedSupabase
        .from('user_profiles')
        .update(updates)
        .eq('owner_email', 'demo@owneriq.com')
        .select()
        .single();
    } else {
      // Use scoped client (authenticated as user)
      console.log('🔍 Updating profile for userId:', userId);

      // Use strict UPDATE because the profile must exist by now (created in GET /profile or step 1).
      // Using UPSERT with incomplete data can fail not-null constraints if it tries to INSERT.
      query = scopedSupabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
    }

    const { data: profile, error } = await query;

    if (error) {
      console.error('❌ Supabase Error:', error);
      throw error;
    }

    // Log profile update
    const eventLogger = new OnboardingEventLogger(scopedSupabase);
    await eventLogger.logProfileUpdated(userId, updates);

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error updating user profile:', error);
    const fs = require('fs');
    fs.appendFileSync('error.log', `${new Date().toISOString()} - Profile Error: ${error.message}\n${error.stack}\n\n`);
    res.status(500).json({ error: 'Failed to update user profile', details: error.message });
  }
});

// GET /api/onboarding/entities - Get user's entities
router.get('/entities', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;

    let query = supabase
      .from('entities')
      .select('*')
      .order('created_at', { ascending: true });

    if (isDemoUser(req)) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data: entities, error } = await query;

    if (error) throw error;

    res.json(entities || []);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities', details: error.message });
  }
});

// POST /api/onboarding/entities - Create new entity
router.post('/entities', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const {
      entity_type,
      entity_name,
      ein,
      entity_email,
      entity_phone
    } = req.body;

    const entityData = {
      user_id: userId,
      entity_type: entity_type || 'company',
      entity_name: entity_name?.trim(),
      ein: ein?.trim(),
      entity_email: entity_email?.trim().toLowerCase(),
      entity_phone: entity_phone?.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: entity, error } = await supabase
      .from('entities')
      .insert(entityData)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, entity });
  } catch (error) {
    console.error('Error creating entity:', error);
    res.status(500).json({ error: 'Failed to create entity', details: error.message });
  }
});

// PUT /api/onboarding/entities/:id - Update entity
router.put('/entities/:id', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const { id } = req.params;
    const {
      entity_type,
      entity_name,
      ein,
      entity_email,
      entity_phone
    } = req.body;

    const entityData = {
      entity_type: entity_type || 'company',
      entity_name: entity_name?.trim(),
      ein: ein?.trim(),
      entity_email: entity_email?.trim().toLowerCase(),
      entity_phone: entity_phone?.trim(),
      updated_at: new Date().toISOString()
    };

    let query = supabase
      .from('entities')
      .update(entityData)
      .eq('entity_id', id);

    if (!isDemoUser(req)) {
      query = query.eq('user_id', userId);
    }

    const { data: entity, error } = await query.select().single();

    if (error) throw error;

    res.json({ success: true, entity });
  } catch (error) {
    console.error('Error updating entity:', error);
    res.status(500).json({ error: 'Failed to update entity', details: error.message });
  }
});

// DELETE /api/onboarding/entities/:id - Delete entity
router.delete('/entities/:id', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const { id } = req.params;

    let query = supabase
      .from('entities')
      .delete()
      .eq('entity_id', id);

    if (!isDemoUser(req)) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity:', error);
    res.status(500).json({ error: 'Failed to delete entity', details: error.message });
  }
});

// POST /api/onboarding/batches - Create new import batch
router.post('/batches', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const {
      property_type,
      entity_id,
      property_address,
      property_city,
      property_state,
      property_zip,
      refinanced
    } = req.body;

    // Calculate required documents based on property type
    const isInvestment = property_type === 'investment';
    const documentsRequired = isInvestment ? 8 : 7; // Investment properties require appraisal

    const batchData = {
      user_id: userId,
      property_type,
      entity_id: entity_id || null,
      property_address: property_address?.trim(),
      property_city: property_city?.trim(),
      property_state: property_state?.trim(),
      property_zip: property_zip?.trim(),
      refinanced: refinanced || false,
      status: 'PENDING',
      documents_completed: 0,
      documents_required: documentsRequired,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: batch, error } = await supabase
      .from('import_batches')
      .insert(batchData)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, batch });
  } catch (error) {
    console.error('Error creating import batch:', error);
    res.status(500).json({ error: 'Failed to create import batch', details: error.message });
  }
});

// GET /api/onboarding/batches - Get user's import batches
router.get('/batches', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;

    let query = supabase
      .from('import_batches')
      .select(`
        *,
        entities:entity_id (
          entity_id,
          entity_name,
          entity_type,
          ein
        )
      `)
      .order('created_at', { ascending: false });

    if (isDemoUser(req)) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data: batches, error } = await query;

    if (error) throw error;

    res.json(batches || []);
  } catch (error) {
    console.error('Error fetching import batches:', error);
    res.status(500).json({ error: 'Failed to fetch import batches', details: error.message });
  }
});

// GET /api/onboarding/batches/:id - Get specific import batch
router.get('/batches/:id', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const { id } = req.params;

    let query = supabase
      .from('import_batches')
      .select(`
        *,
        entities:entity_id (
          entity_id,
          entity_name,
          entity_type,
          ein
        ),
        document_uploads (
          upload_id,
          doc_type_id,
          filename,
          upload_status,
          ai_confidence,
          created_at
        )
      `)
      .eq('batch_id', id);

    if (!isDemoUser(req)) {
      query = query.eq('user_id', userId);
    }

    const { data: batch, error } = await query.single();

    if (error) throw error;

    res.json(batch);
  } catch (error) {
    console.error('Error fetching import batch:', error);
    res.status(500).json({ error: 'Failed to fetch import batch', details: error.message });
  }
});

// GET /api/onboarding/document-types - Get document types
router.get('/document-types', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const { property_type } = req.query;

    let query = supabase
      .from('document_types')
      .select('*')
      .order('doc_type_id');

    const { data: docTypes, error } = await query;

    if (error) throw error;

    // Filter based on property type
    let filteredTypes = docTypes || [];
    if (property_type === 'investment') {
      filteredTypes = filteredTypes.filter(doc =>
        doc.is_required_for_all || doc.is_required_for_investor || doc.is_optional
      );
    } else {
      filteredTypes = filteredTypes.filter(doc =>
        doc.is_required_for_all || doc.is_optional
      );
    }

    res.json(filteredTypes);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Failed to fetch document types', details: error.message });
  }
});

// POST /api/onboarding/upload - Upload document
// POST /api/onboarding/upload - Upload document and process with AI
router.post('/upload', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const {
      batch_id,
      doc_type_id,
      filename,
      file_data // Base64 encoded file data
    } = req.body;

    // Initialize scoped client for RLS
    const { createClient } = require('@supabase/supabase-js');
    const scopedSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers['authorization']
          }
        }
      }
    );

    // Initialize event logger
    const eventLogger = new OnboardingEventLogger(scopedSupabase);

    // Validate or Create Batch
    let batchQuery = supabase
      .from('import_batches')
      .select('user_id, status')
      .eq('batch_id', batch_id);

    if (!isDemoUser(req)) {
      batchQuery = batchQuery.eq('user_id', userId);
    }

    let { data: batch, error: batchError } = await batchQuery.maybeSingle();

    if (!batch) {
      console.log(`⚠️ Batch ${batch_id} not found. Creating new batch...`);
      // Create new batch on the fly
      const { data: newBatch, error: createError } = await scopedSupabase
        .from('import_batches')
        .insert({
          batch_id,
          user_id: userId,
          property_type: 'investment',
          status: 'PENDING',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        // Handle race condition - batch might have been created between our check and insert
        if (createError.code === '23505') {
          console.log('⚠️ Batch created concurrently, fetching existing...');
          const { data: existingBatch } = await batchQuery.single();
          batch = existingBatch;
        } else {
          console.error('Failed to create batch (Details):', JSON.stringify(createError, null, 2));
          await eventLogger.logError(userId, 'batch_creation_failed', createError.message, {
            batch_id,
            error_code: createError.code
          });
          return res.status(500).json({ error: 'Failed to create import batch', details: createError });
        }
      } else {
        batch = newBatch;
        // Log batch creation
        await eventLogger.logBatchCreated(userId, batch_id, 'investment');
      }
    }

    // Prepare file data
    const buffer = Buffer.from(file_data, 'base64');
    const fileSize = buffer.length;

    // Get document type name from doc_type_id (closing, mortgage, etc.)
    const { data: docType } = await scopedSupabase
      .from('document_types')
      .select('name')
      .eq('doc_type_id', doc_type_id)
      .single();

    // Create descriptive filename: DocumentType_UserID.pdf
    const docTypeName = docType?.name || doc_type_id;
    const userIdShort = userId.substring(0, 8); // First 8 chars of UUID
    const cleanDocType = docTypeName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const descriptiveFilename = `${cleanDocType}_${userIdShort}.pdf`;

    // Upload to Supabase Storage
    const storagePath = `${userId}/${batch_id}/${descriptiveFilename}`;
    const { data: storageData, error: storageError } = await scopedSupabase
      .storage
      .from('property-documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true // Allow overwriting if same doc is uploaded again
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      await eventLogger.logUploadError(userId, batch_id, doc_type_id, storageError);
      return res.status(500).json({ error: 'Failed to upload file to storage', details: storageError });
    }

    // Log successful storage upload
    await eventLogger.logStorageUploadSuccess(userId, batch_id, doc_type_id, storagePath);

    // Get public URL
    const { data: { publicUrl } } = scopedSupabase
      .storage
      .from('property-documents')
      .getPublicUrl(storagePath);

    console.log(`✅ File uploaded to storage: ${storagePath}`);

    // 1. Create upload record with real storage path
    const { data: upload, error: uploadError } = await scopedSupabase
      .from('document_uploads')
      .insert({
        batch_id,
        doc_type_id,
        filename: descriptiveFilename,
        original_filename: filename,
        file_path: storagePath, // Real path in Supabase Storage
        file_size_bytes: fileSize,
        mime_type: 'application/pdf',
        upload_status: 'PROCESSING',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (uploadError) {
      await eventLogger.logError(userId, 'document_upload_db_failed', uploadError.message, {
        batch_id,
        doc_type_id,
        error_code: uploadError.code
      });
      throw uploadError;
    }

    // Log successful document upload
    await eventLogger.logDocumentUploaded(userId, batch_id, upload.upload_id, doc_type_id, {
      filename: descriptiveFilename,
      size_bytes: fileSize,
      storage_path: storagePath
    });


    console.log(`✅ Document uploaded successfully: ${upload.upload_id}`);

    // ========================================
    // AI PROCESSING DISABLED
    // ========================================
    // El procesamiento AI se hará manualmente desde la consola de administración
    // Cuando esté listo, descomentar este bloque y configurar OPENAI_API_KEY

    /*
    // 2. Trigger AI Extraction (Async)
    // Use the DocumentPipeline to process the file
    (async () => {
      let tempFilePath = null;
      try {
        // Create temp file
        const tempDir = os.tmpdir();
        tempFilePath = path.join(tempDir, `upload_${Date.now()}_${filename}`);
        fs.writeFileSync(tempFilePath, buffer);

        console.log(`🤖 Processing document ${upload.upload_id} with AI Pipeline...`);

        // Log processing start
        await eventLogger.logDocumentProcessingStarted(userId, batch_id, upload.upload_id, doc_type_id);

        // Execute Pipeline
        const result = await pipeline.process(tempFilePath, {
          metadata: {
            user_id: userId,
            batch_id: batch_id,
            original_filename: filename
          }
        });

        console.log(`✅ AI Extraction complete for ${upload.upload_id}. Type: ${result.document_type}`);

        // 3. Update upload record with results
        await scopedSupabase
          .from('document_uploads')
          .update({
            upload_status: 'PROCESSED',
            extracted_data: result.extracted_data,
            ai_confidence: result.extraction_confidence || 0.95,
            validation_errors: result.validation ? result.validation.errors : null,
            processed_at: new Date().toISOString()
          })
          .eq('upload_id', upload.upload_id);

        // Log successful processing
        await eventLogger.logDocumentProcessed(userId, batch_id, upload.upload_id, doc_type_id, result.extracted_data);

        // 4. Update core tables if data found (Simplified mapping)
        // This is where valid data would be synced to property/mortgage tables
        // For now we persist the extracted JSON in the uploads table for review

      } catch (err) {
        console.error('❌ AI Pipeline Error:', err);

        // Update status to FAILED
        await supabase
          .from('document_uploads')
          .update({
            upload_status: 'FAILED',
            validation_errors: { error: err.message },
            processed_at: new Date().toISOString()
          })
          .eq('upload_id', upload.upload_id);

        // Log processing failure
        await eventLogger.logDocumentProcessingFailed(userId, batch_id, upload.upload_id, doc_type_id, err);

      } finally {
        // Cleanup temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {
            console.error('Failed to clean up temp file:', e);
          }
        }
      }
    })();
    */

    res.json({
      success: true,
      message: 'Upload started',
      upload_id: upload.upload_id
    });


  } catch (error) {
    console.error('❌ Error uploading document:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});


// POST /api/onboarding/batches/:id/complete - Complete onboarding batch
router.post('/batches/:id/complete', authenticateToken, async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const userId = isDemoUser(req) ? null : req.user.id;
    const { id } = req.params;

    // Validate batch belongs to user
    let batchQuery = supabase
      .from('import_batches')
      .select('*')
      .eq('batch_id', id);

    if (!isDemoUser(req)) {
      batchQuery = batchQuery.eq('user_id', userId);
    }

    const { data: batch, error: batchError } = await batchQuery.single();

    if (batchError || !batch) {
      return res.status(404).json({ error: 'Import batch not found' });
    }

    if (batch.documents_completed < batch.documents_required) {
      return res.status(400).json({
        error: 'Not all required documents uploaded',
        completed: batch.documents_completed,
        required: batch.documents_required
      });
    }

    // Update batch status
    const { data: updatedBatch, error: updateError } = await supabase
      .from('import_batches')
      .update({
        status: 'COMPLETED',
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check if user has completed all onboarding
    const { data: allBatches } = await supabase
      .from('import_batches')
      .select('status')
      .eq('user_id', userId);

    const allCompleted = allBatches?.every(b => b.status === 'COMPLETED');

    if (allCompleted) {
      await supabase
        .from('user_profiles')
        .update({
          onboarding_status: 'COMPLETED',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    }

    res.json({
      success: true,
      batch: updatedBatch,
      all_completed: allCompleted
    });
  } catch (error) {
    console.error('Error completing batch:', error);
    res.status(500).json({ error: 'Failed to complete batch', details: error.message });
  }
});

// POST /api/onboarding/reset - Reset onboarding for testing (no auth required)
router.post('/reset', async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log(`🔄 Resetting onboarding for ${email}...`);

    // Reset user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        onboarding_status: 'INCOMPLETE',
        current_step: 1,
        updated_at: new Date().toISOString()
      })
      .eq('owner_email', email);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ error: 'Failed to reset onboarding', details: profileError.message });
    }

    // Get user to reset their batches
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('owner_email', email)
      .single();

    if (profile?.user_id) {
      const { error: batchError } = await supabase
        .from('import_batches')
        .update({ status: 'PENDING' })
        .eq('user_id', profile.user_id);

      if (batchError) {
        console.error('Error updating batches:', batchError);
      }
    }

    console.log('✅ Onboarding reset successfully!');
    res.json({ success: true, message: 'Onboarding reset successfully' });

  } catch (error) {
    console.error('Error resetting onboarding:', error);
    res.status(500).json({ error: 'Failed to reset onboarding', details: error.message });
  }
});

function registerOnboardingRoutes(app, supabase, authenticateToken) {
  // Store supabase client in app locals for routes to access
  app.locals.supabase = supabase;
  app.use('/api/onboarding', router);
}

module.exports = { registerOnboardingRoutes, router };