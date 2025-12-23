const XLSX = require('xlsx');

// Read the mortgage Excel file
const workbook = XLSX.readFile('./mortgage-file.xlsx');

console.log('📋 Available sheets in Mortgage file:');
workbook.SheetNames.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
});

console.log('\n' + '='.repeat(100) + '\n');

// Sheets to analyze
const sheetsToAnalyze = [
    'Escrow Amount',
    'CCs & Cash Out',
    'Heloc & purchase Calc'
];

sheetsToAnalyze.forEach(sheetName => {
    if (workbook.SheetNames.includes(sheetName)) {
        console.log(`📊 ANALYZING: ${sheetName}`);
        console.log('='.repeat(100));

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // Display first 50 rows
        jsonData.slice(0, 50).forEach((row, idx) => {
            if (row && row.some(cell => cell !== '')) {
                console.log(`Row ${idx}:`, JSON.stringify(row));
            }
        });

        console.log('\n' + '='.repeat(100) + '\n');
    } else {
        console.log(`⚠️  Sheet '${sheetName}' not found!\n`);
    }
});
