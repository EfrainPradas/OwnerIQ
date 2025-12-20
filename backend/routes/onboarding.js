const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

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

    let query = supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId);

    if (isDemoUser(req)) {
      query = query.is('user_id', null);
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
      const { data: newProfile, error: createError } = await supabase
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
        console.error('🔍 Error creating profile:', createError);
        throw createError;
      }
      console.log('🔍 Profile created successfully');
      return res.json(newProfile);
    }

    console.log('🔍 Returning existing profile');
    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

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

    const profileData = {
      user_id: userId,
      owner_name: owner_name?.trim(),
      owner_email: owner_email?.trim().toLowerCase(),
      owner_phone: owner_phone?.trim(),
      user_type,
      has_primary_residence: has_primary_residence || false,
      investment_property_count: parseNumeric(investment_property_count) || 0,
      onboarding_status: onboarding_status || 'IN_PROGRESS',
      current_step: parseNumeric(current_step) || 1,
      updated_at: new Date().toISOString()
    };

    let query;
    if (isDemoUser(req)) {
      // For demo mode, upsert without user_id
      query = supabase
        .from('user_profiles')
        .upsert({ ...profileData, user_id: null }, {
          onConflict: 'owner_email'
        })
        .select()
        .single();
    } else {
      query = supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select()
        .single();
    }

    const { data: profile, error } = await query;

    if (error) throw error;

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error updating user profile:', error);
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

    // Validate batch belongs to user
    let batchQuery = supabase
      .from('import_batches')
      .select('user_id, status')
      .eq('batch_id', batch_id);

    if (!isDemoUser(req)) {
      batchQuery = batchQuery.eq('user_id', userId);
    }

    const { data: batch, error: batchError } = await batchQuery.single();

    if (batchError || !batch) {
      return res.status(404).json({ error: 'Import batch not found' });
    }

    if (batch.status !== 'PENDING' && batch.status !== 'UPLOADING') {
      return res.status(400).json({ error: 'Batch is not in uploadable state' });
    }

    // In a real implementation, you would:
    // 1. Decode base64 file data
    // 2. Validate file size and type
    // 3. Upload to storage service (S3, Supabase Storage, etc.)
    // 4. Store file path in database

    // For now, simulate file upload
    const filePath = `imports/${userId || 'demo'}/${batch_id}/${Date.now()}_${filename}`;
    const fileSize = Buffer.from(file_data, 'base64').length;

    const uploadData = {
      batch_id,
      doc_type_id,
      filename: `${Date.now()}_${filename}`,
      original_filename: filename,
      file_path: filePath,
      file_size_bytes: fileSize,
      mime_type: 'application/pdf', // Detect from file
      upload_status: 'UPLOADED',
      created_at: new Date().toISOString()
    };

    const { data: upload, error: uploadError } = await supabase
      .from('document_uploads')
      .insert(uploadData)
      .select()
      .single();

    if (uploadError) throw uploadError;

    // Update batch status and document count
    const { data: updatedBatch, error: updateError } = await supabase
      .from('import_batches')
      .update({
        status: 'UPLOADING',
        documents_completed: supabase.raw('documents_completed + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', batch_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      upload: {
        ...upload,
        batch: updatedBatch
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
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