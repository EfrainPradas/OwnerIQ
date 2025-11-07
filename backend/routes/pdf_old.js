const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const upload = multer({ dest: uploadDir });

const router = express.Router();

console.log('📄 Setting up PDF extraction route handler...');

router.post('/extract-from-pdf', upload.single('file'), async (req, res) => {
  console.log('🎯 PDF extraction route hit!');
  console.log('Request file:', req.file);

  if (!req.file) {
    console.log('❌ No file uploaded');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);

    const pythonScriptPath = path.join(__dirname, '..', '..', 'extract_property_data.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    let extractedData = '';
    let errorData = '';

    pythonProcess.stdin.write(pdfData.text);
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      extractedData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete temp file: ${filePath}`, err);
      });

      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(errorData);
        return res.status(500).json({ error: 'Failed to extract data from PDF.', details: errorData });
      }

      try {
        const jsonData = JSON.parse(extractedData);
        console.log('✅ PDF data extracted successfully');
        console.log('\n' + '═'.repeat(80));
        console.log('📋 DATOS EXTRAÍDOS DEL PDF (JSON FORMATEADO):');
        console.log('═'.repeat(80));
        console.log(JSON.stringify(jsonData, null, 2));
        console.log('═'.repeat(80) + '\n');
        
        // También guardar en archivo para fácil lectura
        const outputPath = path.join(__dirname, '..', 'ultimo_pdf_extraido.json');
        fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
        console.log(`💾 JSON guardado en: ${outputPath}`);
        
        res.json(jsonData);
      } catch (parseError) {
        console.error('Error parsing JSON from Python script:', parseError);
        res.status(500).json({ error: 'Failed to parse extracted data.', details: extractedData });
      }
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete temp file: ${filePath}`, err);
    });
    res.status(500).json({ error: 'Failed to process PDF.', details: error.message });
  }
});

console.log('✅ PDF route handler configured');

module.exports = router;