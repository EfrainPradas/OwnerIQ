/**
 * Clasificador de Documentos usando IA
 */

const OpenAIClient = require('../ai/openai-client');
const config = require('../config');
const logger = require('../utils/logger');

class DocumentClassifier {
  constructor() {
    this.aiClient = new OpenAIClient();
  }

  /**
   * Clasificar documento
   */
  async classify(text, metadata = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting document classification', {
        textLength: text.length,
        ...metadata,
      });

      // Clasificar usando IA
      const result = await this.aiClient.classify(text);
      
      // Validar confianza mínima
      if (result.confidence < config.MIN_CLASSIFICATION_CONFIDENCE) {
        logger.warn('Low classification confidence', {
          confidence: result.confidence,
          documentType: result.document_type,
        });
      }

      const duration = Date.now() - startTime;
      
      logger.info('Classification completed', {
        documentType: result.document_type,
        confidence: result.confidence,
        duration,
      });

      return {
        document_type: result.document_type,
        confidence: result.confidence,
        reasoning: result.reasoning,
        metadata: {
          ...result.metadata,
          classification_duration_ms: duration,
        },
      };

    } catch (error) {
      logger.error('Classification failed', {
        error: error.message,
        stack: error.stack,
      });
      
      // Retornar tipo desconocido en caso de error
      return {
        document_type: config.DOCUMENT_TYPES.UNKNOWN,
        confidence: 0.0,
        reasoning: `Classification failed: ${error.message}`,
        metadata: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Clasificar múltiples documentos en batch
   */
  async classifyBatch(documents) {
    logger.info('Starting batch classification', {
      count: documents.length,
    });

    const results = await Promise.all(
      documents.map(async (doc) => {
        try {
          return await this.classify(doc.text, doc.metadata);
        } catch (error) {
          logger.error('Batch classification error', {
            documentId: doc.id,
            error: error.message,
          });
          return {
            document_type: config.DOCUMENT_TYPES.UNKNOWN,
            confidence: 0.0,
            error: error.message,
          };
        }
      })
    );

    return results;
  }

  /**
   * Validar tipo de documento
   */
  isValidDocumentType(documentType) {
    return Object.values(config.DOCUMENT_TYPES).includes(documentType);
  }

  /**
   * Obtener descripción del tipo de documento
   */
  getDocumentTypeDescription(documentType) {
    const descriptions = {
      [config.DOCUMENT_TYPES.CLOSING_ALTA]: 'Closing/ALTA Settlement Statement',
      [config.DOCUMENT_TYPES.FIRST_PAYMENT_LETTER]: 'First Payment Information Letter',
      [config.DOCUMENT_TYPES.ESCROW_DISCLOSURE]: 'Initial Escrow Account Disclosure',
      [config.DOCUMENT_TYPES.HOI]: 'Home Owner Insurance Policy',
      [config.DOCUMENT_TYPES.EXHIBIT_A]: 'Exhibit A - Legal Property Description',
      [config.DOCUMENT_TYPES.TAX_BILL]: 'Property Tax Bill',
      [config.DOCUMENT_TYPES.LEASE]: 'Residential Lease Agreement',
      [config.DOCUMENT_TYPES.MORTGAGE_STATEMENT]: 'Mortgage/Loan Statement',
      [config.DOCUMENT_TYPES.UNKNOWN]: 'Unknown Document Type',
    };

    return descriptions[documentType] || 'Unknown';
  }
}

module.exports = DocumentClassifier;