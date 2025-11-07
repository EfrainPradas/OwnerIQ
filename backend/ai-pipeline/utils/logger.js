/**
 * Sistema de Logging para el Pipeline de IA
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

class Logger {
  constructor() {
    this.logLevel = config.LOG_LEVEL;
    this.logsDir = config.LOGS_DIR;
    
    // Crear directorio de logs si no existe
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
  }

  /**
   * Log de error
   */
  error(message, meta = {}) {
    this._log('error', message, meta);
  }

  /**
   * Log de advertencia
   */
  warn(message, meta = {}) {
    this._log('warn', message, meta);
  }

  /**
   * Log de información
   */
  info(message, meta = {}) {
    this._log('info', message, meta);
  }

  /**
   * Log de debug
   */
  debug(message, meta = {}) {
    this._log('debug', message, meta);
  }

  /**
   * Log interno
   */
  _log(level, message, meta) {
    if (this.levels[level] > this.levels[this.logLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    };

    // Console output
    const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'error':
        console.error(consoleMessage, meta);
        break;
      case 'warn':
        console.warn(consoleMessage, meta);
        break;
      default:
        console.log(consoleMessage, meta);
    }

    // File output
    this._writeToFile(level, logEntry);
  }

  /**
   * Escribir a archivo
   */
  _writeToFile(level, logEntry) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${level}-${date}.log`;
      const filepath = path.join(this.logsDir, filename);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Log de procesamiento de documento
   */
  logDocumentProcessing(documentId, stage, data = {}) {
    this.info(`Document ${documentId} - ${stage}`, {
      document_id: documentId,
      stage,
      ...data,
    });
  }

  /**
   * Log de request de IA
   */
  logAIRequest(provider, operation, data = {}) {
    if (config.LOG_AI_REQUESTS) {
      this.info(`AI Request - ${provider} ${operation}`, {
        provider,
        operation,
        ...data,
      });
    }
  }

  /**
   * Log de error de procesamiento
   */
  logProcessingError(documentId, error, context = {}) {
    this.error(`Processing error for document ${documentId}`, {
      document_id: documentId,
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}

// Singleton
const logger = new Logger();

module.exports = logger;