/**
 * API Routes para Property Documents
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * POST /api/property-documents
 * Save a property document record to the database
 */
router.post('/', authenticateToken, async (req, res) => {
  const {
    property_id,
    user_id,
    document_type,
    file_name,
    file_path,
    file_url,
    file_size,
    metadata
  } = req.body;

  // Validate required fields
  if (!property_id || !file_name || !file_path) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['property_id', 'file_name', 'file_path']
    });
  }

  try {
    // Insert document record
    const { data, error } = await supabase
      .from('property_document')
      .insert([{
        property_id,
        user_id: user_id || req.user.id,
        document_type: document_type || 'unknown',
        file_name,
        file_path,
        file_url,
        file_size,
        metadata: metadata ? JSON.stringify(metadata) : null,
        uploaded_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error creating property document:', error);
      return res.status(500).json({
        error: 'Failed to save document record',
        details: error.message
      });
    }

    console.log(`✅ Property document saved: ${file_name} for property ${property_id}`);

    res.status(201).json(data);

  } catch (error) {
    console.error('Error saving property document:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/property-documents/:propertyId
 * Get all documents for a property
 */
router.get('/:propertyId', authenticateToken, async (req, res) => {
  const { propertyId } = req.params;

  try {
    const { data, error } = await supabase
      .from('property_document')
      .select('*')
      .eq('property_id', propertyId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Database error fetching property documents:', error);
      return res.status(500).json({
        error: 'Failed to fetch documents',
        details: error.message
      });
    }

    res.json(data || []);

  } catch (error) {
    console.error('Error fetching property documents:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/property-documents/:documentId
 * Delete a property document
 */
router.delete('/:documentId', authenticateToken, async (req, res) => {
  const { documentId } = req.params;

  try {
    // Get document info first
    const { data: document, error: fetchError } = await supabase
      .from('property_document')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    // Delete from storage if file_path exists
    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('property_document')
      .delete()
      .eq('document_id', documentId);

    if (deleteError) {
      console.error('Database error deleting property document:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete document',
        details: deleteError.message
      });
    }

    console.log(`✅ Property document deleted: ${documentId}`);

    res.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error deleting property document:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
