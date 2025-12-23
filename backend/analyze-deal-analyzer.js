const XLSX = require('xlsx');
const workbook = XLSX.readFile('./Deal Analyzer Revised Jun-2025.xlsx');

// Analyze "Deal Analyzer - Duple AO" sheet
const sheetName = 'Deal Analyzer - Duple AO';
console.log(`📊 ANALYZING: ${sheetName}`);
console.log('='.repeat(100) + '\n');

const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Display first 60 rows
jsonData.slice(0, 60).forEach((row, idx) => {
    if (row && row.some(cell => cell !== '')) {
        console.log(`Row ${idx}:`, JSON.stringify(row));
    }
});
