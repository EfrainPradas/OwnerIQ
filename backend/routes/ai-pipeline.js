/**
 * API Routes para el Pipeline de IA
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DocumentPipeline = require('../ai-pipeline');
const logger = require('../ai-pipeline/utils/logger');
const config = require('../ai-pipeline/config');

const router = express.Router();

// Configurar multer para uploads
const upload = multer({
  dest: config.UPLOAD_DIR,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Configurar multer para múltiples archivos (carpeta completa)
const uploadMultiple = multer({
  dest: config.UPLOAD_DIR,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por archivo (aumentado)
    files: 50, // Máximo 50 archivos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Instancia del pipeline
const pipeline = new DocumentPipeline();

// Store para tracking de procesamiento en memoria
const processingStore = new Map();

/**
 * POST /api/ai-pipeline/process
 * Procesar un documento PDF con IA
 */
router.post('/process', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      message: 'Please upload a PDF file'
    });
  }

  const filePath = req.file.path;
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    logger.info('AI Pipeline process request', {
      documentId,
      filename: req.file.originalname,
      size: req.file.size,
      user: req.user?.id,
    });

    // Marcar como procesando
    processingStore.set(documentId, {
      status: 'processing',
      started_at: new Date().toISOString(),
      filename: req.file.originalname,
    });

    // Procesar documento
    const result = await pipeline.process(filePath, {
      metadata: {
        property_id: req.body.property_id,
        user_id: req.user?.id,
        uploaded_by: req.user?.email,
        original_filename: req.file.originalname,
      }
    });

    // Actualizar store
    processingStore.set(documentId, {
      status: 'completed',
      started_at: processingStore.get(documentId).started_at,
      completed_at: new Date().toISOString(),
      result,
    });

    const duration = Date.now() - startTime;
    
    logger.info('AI Pipeline process completed', {
      documentId: result.document_id,
      documentType: result.document_type,
      duration,
      tokensUsed: result.processing.ai_tokens_used,
    });

    // Responder con resultado
    res.json({
      success: true,
      document_id: result.document_id,
      document_type: result.document_type,
      classification_confidence: result.classification_confidence,
      extracted_data: result.extracted_data,
      validation: result.validation,
      processing: {
        duration_ms: duration,
        ai_tokens_used: result.processing.ai_tokens_used,
      },
      metadata: result.metadata,
    });

  } catch (error) {
    logger.error('AI Pipeline process error', {
      documentId,
      error: error.message,
      stack: error.stack,
    });

    // Actualizar store con error
    processingStore.set(documentId, {
      status: 'failed',
      error: error.message,
      started_at: processingStore.get(documentId)?.started_at,
      failed_at: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      error: 'Document processing failed',
      message: error.message,
      document_id: documentId,
    });

  } finally {
    // Limpiar archivo temporal
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) logger.error('Failed to delete temp file', { filePath, error: err.message });
      });
    }
  }
});

/**
 * POST /api/ai-pipeline/process-batch
 * Procesar múltiples documentos PDF con IA (carpeta completa)
 */
router.post('/process-batch', uploadMultiple.array('files', 50), async (req, res) => {
  const startTime = Date.now();
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'No files uploaded',
      message: 'Please upload at least one PDF file'
    });
  }

  const propertyId = req.body.property_id;
  const userId = req.user?.id;

  logger.info('AI Pipeline batch process request', {
    batchId,
    filesCount: req.files.length,
    propertyId,
    userId,
  });

  const results = [];
  const errors = [];
  const tempFiles = [];

  try {
    // Procesar cada archivo
    for (const file of req.files) {
      const filePath = file.path;
      tempFiles.push(filePath);

      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      try {
        logger.info('Processing file in batch', {
          batchId,
          documentId,
          filename: file.originalname,
          size: file.size,
        });

        // Marcar como procesando
        processingStore.set(documentId, {
          status: 'processing',
          batch_id: batchId,
          started_at: new Date().toISOString(),
          filename: file.originalname,
        });

        // Procesar documento
        const result = await pipeline.process(filePath, {
          metadata: {
            batch_id: batchId,
            property_id: propertyId,
            user_id: userId,
            uploaded_by: req.user?.email,
            original_filename: file.originalname,
          }
        });

        // Actualizar store
        processingStore.set(documentId, {
          status: 'completed',
          batch_id: batchId,
          started_at: processingStore.get(documentId).started_at,
          completed_at: new Date().toISOString(),
          result,
        });

        results.push({
          document_id: result.document_id,
          filename: file.originalname,
          document_type: result.document_type,
          classification_confidence: result.classification_confidence,
          extracted_data: result.extracted_data,
          validation: result.validation,
          processing: {
            ai_tokens_used: result.processing.ai_tokens_used,
          },
        });

        logger.info('File processed successfully in batch', {
          batchId,
          documentId: result.document_id,
          filename: file.originalname,
          documentType: result.document_type,
        });

      } catch (error) {
        logger.error('Error processing file in batch', {
          batchId,
          documentId,
          filename: file.originalname,
          error: error.message,
        });

        // Actualizar store con error
        processingStore.set(documentId, {
          status: 'failed',
          batch_id: batchId,
          error: error.message,
          started_at: processingStore.get(documentId)?.started_at,
          failed_at: new Date().toISOString(),
        });

        errors.push({
          filename: file.originalname,
          error: error.message,
          document_id: documentId,
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalTokens = results.reduce((sum, r) => sum + (r.processing.ai_tokens_used || 0), 0);

    logger.info('AI Pipeline batch process completed', {
      batchId,
      totalFiles: req.files.length,
      successCount: results.length,
      errorCount: errors.length,
      duration,
      totalTokens,
    });

    // Responder con resultados consolidados
    res.json({
      success: true,
      batch_id: batchId,
      summary: {
        total_files: req.files.length,
        successful: results.length,
        failed: errors.length,
        duration_ms: duration,
        total_tokens_used: totalTokens,
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
      by_document_type: results.reduce((acc, r) => {
        acc[r.document_type] = (acc[r.document_type] || 0) + 1;
        return acc;
      }, {}),
    });

  } catch (error) {
    logger.error('AI Pipeline batch process error', {
      batchId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Batch processing failed',
      message: error.message,
      batch_id: batchId,
      partial_results: results.length > 0 ? results : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });

  } finally {
    // Limpiar archivos temporales
    for (const filePath of tempFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) logger.error('Failed to delete temp file', { filePath, error: err.message });
        });
      }
    }
  }
});

/**
 * GET /api/ai-pipeline/status/:documentId
 * Obtener estado de procesamiento
 */
router.get('/status/:documentId', (req, res) => {
  const { documentId } = req.params;
  
  const status = processingStore.get(documentId);
  
  if (!status) {
    return res.status(404).json({
      error: 'Document not found',
      document_id: documentId,
    });
  }

  res.json({
    document_id: documentId,
    status: status.status,
    started_at: status.started_at,
    completed_at: status.completed_at,
    failed_at: status.failed_at,
    error: status.error,
  });
});

/**
 * GET /api/ai-pipeline/result/:documentId
 * Obtener resultado completo
 */
router.get('/result/:documentId', (req, res) => {
  const { documentId } = req.params;
  
  const stored = processingStore.get(documentId);
  
  if (!stored) {
    return res.status(404).json({
      error: 'Document not found',
      document_id: documentId,
    });
  }

  if (stored.status !== 'completed') {
    return res.status(400).json({
      error: 'Document processing not completed',
      status: stored.status,
      document_id: documentId,
    });
  }

  res.json(stored.result);
});

/**
 * GET /api/ai-pipeline/stats
 * Estadísticas de procesamiento
 */
router.get('/stats', (req, res) => {
  const stats = {
    total_documents: processingStore.size,
    by_status: {},
    by_type: {},
  };

  for (const [id, data] of processingStore.entries()) {
    // Contar por status
    stats.by_status[data.status] = (stats.by_status[data.status] || 0) + 1;
    
    // Contar por tipo (solo completados)
    if (data.status === 'completed' && data.result) {
      const type = data.result.document_type;
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;
    }
  }

  res.json(stats);
});

/**
 * POST /api/ai-pipeline/clear-cache
 * Limpiar cache de procesamiento
 */
router.post('/clear-cache', (req, res) => {
  const size = processingStore.size;
  processingStore.clear();
  
  logger.info('Processing cache cleared', { entriesRemoved: size });
  
  res.json({
    success: true,
    message: `Cache cleared (${size} entries removed)`,
  });
});

module.exports = router;