/**
 * Configuración del Pipeline de IA
 */

module.exports = {
  // Proveedor de IA (openai, anthropic, local)
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  
  // API Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  
  // Modelos
  MODELS: {
    CLASSIFIER: process.env.AI_CLASSIFIER_MODEL || 'gpt-4o-mini',
    EXTRACTOR: process.env.AI_EXTRACTOR_MODEL || 'gpt-4o',
  },
  
  // Límites
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB (aumentado para documentos grandes)
  MAX_PAGES: 500, // Aumentado de 100 a 500 para documentos REFI largos
  MAX_TOKENS: 128000,
  
  // Timeouts (ms)
  PROCESSING_TIMEOUT: 120000, // 2 minutos
  AI_REQUEST_TIMEOUT: 60000,  // 1 minuto
  
  // Cache
  ENABLE_CACHE: process.env.ENABLE_AI_CACHE !== 'false',
  CACHE_TTL: 3600, // 1 hora
  
  // Confianza mínima
  MIN_CLASSIFICATION_CONFIDENCE: 0.7,
  MIN_EXTRACTION_CONFIDENCE: 0.6,
  
  // Tipos de documentos soportados
  DOCUMENT_TYPES: {
    CLOSING_ALTA: 'closing_alta',
    FIRST_PAYMENT_LETTER: 'first_payment_letter',
    ESCROW_DISCLOSURE: 'escrow_disclosure',
    HOI: 'home_owner_insurance',
    EXHIBIT_A: 'exhibit_a',
    TAX_BILL: 'tax_bill',
    LEASE: 'lease_agreement',
    MORTGAGE_STATEMENT: 'mortgage_statement',
    UNKNOWN: 'unknown'
  },
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_AI_REQUESTS: process.env.LOG_AI_REQUESTS === 'true',
  
  // Base de datos
  DB_SCHEMA: 'public',
  
  // Directorios
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  CACHE_DIR: process.env.CACHE_DIR || './ai-pipeline/cache',
  LOGS_DIR: process.env.LOGS_DIR || './ai-pipeline/logs',
};