const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

// Create uploads and cache directories
const uploadDir = path.join(__dirname, '..', 'uploads');
const cacheDir = path.join(__dirname, '..', 'pdf_cache');

[uploadDir, cacheDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const upload = multer({ dest: uploadDir });

const router = express.Router();

// Cache para PDFs ya procesados (hash -> resultado)
const pdfCache = new Map();

// Timeout para el proceso de Python (30 segundos)
const PYTHON_TIMEOUT = 30000;

/**
 * Calcula hash MD5 del contenido del PDF para cache
 */
function calculateHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Ejecuta el script de Python con timeout y manejo de errores robusto
 */
function executePythonScript(pdfText, scriptPath, timeout = PYTHON_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let extractedData = '';
    let errorData = '';
    let timeoutId;
    let killed = false;

    // Configurar timeout
    timeoutId = setTimeout(() => {
      killed = true;
      pythonProcess.kill('SIGTERM');
      reject(new Error(`Python process timeout after ${timeout}ms`));
    }, timeout);

    // Escribir datos al proceso Python con codificación UTF-8
    try {
      pythonProcess.stdin.write(pdfText, 'utf8');
      pythonProcess.stdin.end();
    } catch (err) {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to write to Python stdin: ${err.message}`));
      return;
    }

    // Capturar stdout con codificación UTF-8
    pythonProcess.stdout.setEncoding('utf8');
    pythonProcess.stdout.on('data', (data) => {
      extractedData += data;
    });

    // Capturar stderr
    pythonProcess.stderr.setEncoding('utf8');
    pythonProcess.stderr.on('data', (data) => {
      errorData += data;
    });

    // Manejar cierre del proceso
    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutId);

      if (killed) {
        return; // Ya se rechazó por timeout
      }

      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${errorData}`));
        return;
      }

      resolve(extractedData);
    });

    // Manejar errores del proceso
    pythonProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

console.log('📄 Setting up improved PDF extraction route handler...');

router.post('/extract-from-pdf', upload.single('file'), async (req, res) => {
  console.log('🎯 PDF extraction route hit!');
  console.log('Request file:', {
    originalname: req.file?.originalname,
    size: req.file?.size,
    mimetype: req.file?.mimetype
  });

  if (!req.file) {
    console.log('❌ No file uploaded');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  let pdfHash = null;

  try {
    // Leer archivo PDF
    const dataBuffer = fs.readFileSync(filePath);
    
    // Calcular hash para cache
    pdfHash = calculateHash(dataBuffer);
    console.log(`📊 PDF hash: ${pdfHash}`);

    // Verificar cache
    if (pdfCache.has(pdfHash)) {
      console.log('✅ Using cached result');
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete temp file: ${filePath}`, err);
      });
      return res.json(pdfCache.get(pdfHash));
    }

    // Extraer texto del PDF
    console.log('📖 Extracting text from PDF...');
    const pdfData = await pdf(dataBuffer);
    console.log(`📝 Extracted ${pdfData.text.length} characters`);

    // Usar el script mejorado de Python
    const pythonScriptPath = path.join(__dirname, '..', '..', 'extract_property_data_improved.py');
    
    // Verificar que el script existe
    if (!fs.existsSync(pythonScriptPath)) {
      throw new Error(`Python script not found: ${pythonScriptPath}`);
    }

    console.log('🐍 Running Python extraction script...');
    const extractedData = await executePythonScript(pdfData.text, pythonScriptPath);

    // Parsear JSON
    const jsonData = JSON.parse(extractedData);
    
    console.log('✅ PDF data extracted successfully');
    console.log('\n' + '═'.repeat(80));
    console.log('📋 DATOS EXTRAÍDOS DEL PDF (JSON FORMATEADO):');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(jsonData, null, 2));
    console.log('═'.repeat(80) + '\n');

    // Guardar en cache
    pdfCache.set(pdfHash, jsonData);
    console.log(`💾 Result cached (cache size: ${pdfCache.size})`);

    // Guardar en archivo para debugging
    const outputPath = path.join(cacheDir, `${pdfHash}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`💾 JSON saved to: ${outputPath}`);

    // Limpiar archivo temporal
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete temp file: ${filePath}`, err);
    });

    res.json(jsonData);

  } catch (error) {
    console.error('❌ Error processing PDF:', error);
    
    // Limpiar archivo temporal
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete temp file: ${filePath}`, err);
    });

    // Responder con error detallado
    res.status(500).json({
      error: 'Failed to process PDF.',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint para limpiar cache
router.post('/clear-pdf-cache', (req, res) => {
  const size = pdfCache.size;
  pdfCache.clear();
  console.log(`🗑️ PDF cache cleared (${size} entries removed)`);
  res.json({ message: `Cache cleared (${size} entries removed)` });
});

// Endpoint para ver estadísticas de cache
router.get('/pdf-cache-stats', (req, res) => {
  res.json({
    cacheSize: pdfCache.size,
    cacheKeys: Array.from(pdfCache.keys())
  });
});

console.log('✅ Improved PDF route handler configured');

module.exports = router;