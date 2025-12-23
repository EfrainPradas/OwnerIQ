const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('./Deal Analyzer Revised Jun-2025.xlsx');

console.log('📋 Available sheets:');
workbook.SheetNames.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Sheets to analyze
const sheetsToAnalyze = [
    'Scrow Amount',
    "CC's & Cash out",
    'Heloc & Purchase calc'
];

sheetsToAnalyze.forEach(sheetName => {
    if (workbook.SheetNames.includes(sheetName)) {
        console.log(`📊 ANALYZING: ${sheetName}`);
        console.log('='.repeat(80));

        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON to see structure
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // Display first 35 rows
        jsonData.slice(0, 35).forEach((row, idx) => {
            if (row && row.some(cell => cell !== '')) {
                console.log(`Row ${idx}:`, JSON.stringify(row));
            }
        });

        console.log('\n' + '='.repeat(80) + '\n');
    } else {
        console.log(`⚠️  Sheet '${sheetName}' not found!\n`);
    }
});
