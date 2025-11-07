/**
 * Pipeline Principal de IA para Documentos Inmobiliarios
 * 
 * Orquesta el flujo completo:
 * 1. Ingestion (PDF → Text + Pages)
 * 2. Classification (IA identifica tipo)
 * 3. Extraction (Extractor especializado)
 * 4. Validation (Normalización y validación)
 * 5. Persistence (Guardado en DB)
 */

const pdf = require('pdf-parse');
const crypto = require('crypto');
const fs = require('fs');
const DocumentClassifier = require('./classification/classifier');
const OpenAIClient = require('./ai/openai-client');
const config = require('./config');
const logger = require('./utils/logger');

class DocumentPipeline {
  constructor() {
    this.classifier = new DocumentClassifier();
    this.aiClient = new OpenAIClient();
  }

  /**
   * Procesar documento completo
   */
  async process(filePath, options = {}) {
    const documentId = this._generateDocumentId();
    const startTime = Date.now();

    try {
      logger.logDocumentProcessing(documentId, 'STARTED', {
        filePath,
        options,
      });

      // 1. INGESTION - Extraer texto y páginas del PDF
      const ingestionResult = await this._ingest(filePath, documentId);
      
      // 2. CLASSIFICATION - Identificar tipo de documento
      const classificationResult = await this._classify(
        ingestionResult.text,
        documentId
      );

      // 3. EXTRACTION - Extraer datos estructurados
      const extractionResult = await this._extract(
        ingestionResult.text,
        classificationResult.document_type,
        documentId
      );

      // 4. VALIDATION - Normalizar y validar datos
      const validationResult = await this._validate(
        extractionResult.fields,
        classificationResult.document_type,
        documentId
      );

      // 5. Construir resultado final
      const processingDuration = Date.now() - startTime;
      const result = {
        document_id: documentId,
        
        // Clasificación
        document_type: classificationResult.document_type,
        classification_confidence: classificationResult.confidence,
        
        // Contenido
        raw_text: ingestionResult.text,
        pages: ingestionResult.pages,
        
        // Extracción
        extracted_data: extractionResult.fields,
        extraction_confidence: extractionResult.confidence,
        
        // Trazabilidad
        source: {
          filename: ingestionResult.filename,
          file_hash: ingestionResult.file_hash,
          file_size: ingestionResult.file_size,
          page_count: ingestionResult.pages.length,
        },
        
        // Procesamiento
        processing: {
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: processingDuration,
          ai_model: config.MODELS.EXTRACTOR,
          ai_tokens_used: this.aiClient.getTotalTokensUsed(),
        },
        
        // Validación
        validation: validationResult,
        
        // Metadatos
        metadata: {
          classification_reasoning: classificationResult.reasoning,
          ...options.metadata,
        },
      };

      logger.logDocumentProcessing(documentId, 'COMPLETED', {
        documentType: result.document_type,
        duration: processingDuration,
        tokensUsed: result.processing.ai_tokens_used,
      });

      return result;

    } catch (error) {
      logger.logProcessingError(documentId, error, {
        filePath,
        stage: 'PIPELINE',
      });

      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  /**
   * 1. INGESTION - Extraer texto y páginas del PDF
   */
  async _ingest(filePath, documentId) {
    logger.logDocumentProcessing(documentId, 'INGESTION_STARTED');

    try {
      // Leer archivo
      const dataBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);
      
      // Validar tamaño
      if (fileStats.size > config.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum (${config.MAX_FILE_SIZE} bytes)`);
      }

      // Calcular hash
      const fileHash = crypto.createHash('md5').update(dataBuffer).digest('hex');

      // Extraer texto del PDF
      const pdfData = await pdf(dataBuffer);
      
      // Validar número de páginas - WARNING pero no bloquear
      if (pdfData.numpages > config.MAX_PAGES) {
        logger.logDocumentProcessing(documentId, 'INGESTION_WARNING', {
          warning: `Document has ${pdfData.numpages} pages (exceeds recommended max of ${config.MAX_PAGES})`,
          action: 'Processing first pages only'
        });
        // Nota: Continuar procesando pero puede ser lento o costoso
      }

      // Normalizar texto
      const normalizedText = this._normalizeText(pdfData.text);

      // Extraer páginas individuales (simulado - pdf-parse no da páginas separadas)
      const pages = this._extractPages(normalizedText, pdfData.numpages);

      logger.logDocumentProcessing(documentId, 'INGESTION_COMPLETED', {
        textLength: normalizedText.length,
        pageCount: pages.length,
        fileHash,
      });

      return {
        text: normalizedText,
        pages,
        filename: filePath.split('/').pop(),
        file_hash: fileHash,
        file_size: fileStats.size,
        page_count: pdfData.numpages,
      };

    } catch (error) {
      logger.logProcessingError(documentId, error, { stage: 'INGESTION' });
      throw error;
    }
  }

  /**
   * 2. CLASSIFICATION - Identificar tipo de documento
   */
  async _classify(text, documentId) {
    logger.logDocumentProcessing(documentId, 'CLASSIFICATION_STARTED');

    try {
      const result = await this.classifier.classify(text, {
        document_id: documentId,
      });

      logger.logDocumentProcessing(documentId, 'CLASSIFICATION_COMPLETED', {
        documentType: result.document_type,
        confidence: result.confidence,
      });

      return result;

    } catch (error) {
      logger.logProcessingError(documentId, error, { stage: 'CLASSIFICATION' });
      throw error;
    }
  }

  /**
   * 3. EXTRACTION - Extraer datos estructurados
   */
  async _extract(text, documentType, documentId) {
    logger.logDocumentProcessing(documentId, 'EXTRACTION_STARTED', {
      documentType,
    });

    try {
      const result = await this.aiClient.extract(text, documentType);

      logger.logDocumentProcessing(documentId, 'EXTRACTION_COMPLETED', {
        fieldsCount: Object.keys(result.fields).length,
        confidence: result.confidence,
      });

      return result;

    } catch (error) {
      logger.logProcessingError(documentId, error, { stage: 'EXTRACTION' });
      throw error;
    }
  }

  /**
   * 4. VALIDATION - Normalizar y validar datos
   */
  async _validate(fields, documentType, documentId) {
    logger.logDocumentProcessing(documentId, 'VALIDATION_STARTED');

    const errors = [];
    const warnings = [];

    try {
      // Validar campos requeridos por tipo de documento
      const requiredFields = this._getRequiredFields(documentType);
      
      for (const fieldName of requiredFields) {
        if (!fields[fieldName] || !fields[fieldName].value) {
          errors.push({
            field: fieldName,
            message: `Required field '${fieldName}' is missing`,
            type: 'MISSING_REQUIRED_FIELD',
          });
        }
      }

      // Validar confianza de campos
      for (const [fieldName, fieldData] of Object.entries(fields)) {
        if (fieldData.confidence < config.MIN_EXTRACTION_CONFIDENCE) {
          warnings.push({
            field: fieldName,
            message: `Low confidence (${fieldData.confidence}) for field '${fieldName}'`,
            type: 'LOW_CONFIDENCE',
          });
        }
      }

      const isValid = errors.length === 0;

      logger.logDocumentProcessing(documentId, 'VALIDATION_COMPLETED', {
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
      });

      return {
        is_valid: isValid,
        errors,
        warnings,
      };

    } catch (error) {
      logger.logProcessingError(documentId, error, { stage: 'VALIDATION' });
      throw error;
    }
  }

  /**
   * Normalizar texto
   */
  _normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n+/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extraer páginas (simulado)
   */
  _extractPages(text, pageCount) {
    const avgCharsPerPage = Math.ceil(text.length / pageCount);
    const pages = [];

    for (let i = 0; i < pageCount; i++) {
      const start = i * avgCharsPerPage;
      const end = Math.min((i + 1) * avgCharsPerPage, text.length);
      
      pages.push({
        page_number: i + 1,
        text: text.substring(start, end),
        extracted_fields: [], // Se llenará durante la extracción
      });
    }

    return pages;
  }

  /**
   * Obtener campos requeridos por tipo de documento
   */
  _getRequiredFields(documentType) {
    const requiredFieldsMap = {
      [config.DOCUMENT_TYPES.CLOSING_ALTA]: ['loan_number', 'property_address', 'borrower_name'],
      [config.DOCUMENT_TYPES.FIRST_PAYMENT_LETTER]: ['loan_number', 'first_payment_date'],
      [config.DOCUMENT_TYPES.ESCROW_DISCLOSURE]: ['loan_number', 'monthly_escrow'],
      [config.DOCUMENT_TYPES.HOI]: ['policy_number', 'effective_date'],
      [config.DOCUMENT_TYPES.TAX_BILL]: ['parcel_number', 'tax_amount'],
      [config.DOCUMENT_TYPES.LEASE]: ['tenant_name', 'monthly_rent'],
      [config.DOCUMENT_TYPES.MORTGAGE_STATEMENT]: ['loan_number', 'principal_balance'],
    };

    return requiredFieldsMap[documentType] || [];
  }

  /**
   * Generar ID único para documento
   */
  _generateDocumentId() {
    return `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = DocumentPipeline;