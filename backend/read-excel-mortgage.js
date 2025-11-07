const XLSX = require('xlsx');
const path = require('path');

// Ruta al archivo Excel
const excelPath = '/mnt/c/OwnerIQ/excel/131 Redwood Track Course - Mortgage-Refinance MAY-2024.xlsx';

console.log('📊 Reading Excel file...\n');

// Leer el archivo
const workbook = XLSX.readFile(excelPath);

// Listar todas las pestañas
console.log('📋 Available sheets:');
workbook.SheetNames.forEach((name, index) => {
  console.log(`  ${index + 1}. ${name}`);
});
console.log('\n');

// Verificar si existe la pestaña MortgageCalculator
if (!workbook.SheetNames.includes('MortgageCalculator')) {
  console.log('❌ Sheet "MortgageCalculator" not found!');
  console.log('Available sheets:', workbook.SheetNames.join(', '));
  process.exit(1);
}

// Leer la pestaña MortgageCalculator
const sheet = workbook.Sheets['MortgageCalculator'];

// Convertir a JSON (con header row)
const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

console.log('🔍 MortgageCalculator Sheet Content:\n');
console.log('=' .repeat(120));

// Mostrar las primeras 100 filas para entender la estructura
jsonData.slice(0, 100).forEach((row, index) => {
  if (row.some(cell => cell !== null && cell !== '')) {
    console.log(`Row ${index + 1}:`, JSON.stringify(row));
  }
});

console.log('\n' + '='.repeat(120));
console.log(`\n📊 Total rows: ${jsonData.length}`);

// Buscar sección de Payment Schedule
console.log('\n🔍 Looking for Payment Schedule section...\n');
jsonData.forEach((row, index) => {
  const rowStr = JSON.stringify(row).toLowerCase();
  if (rowStr.includes('payment') && rowStr.includes('schedule')) {
    console.log(`Found at Row ${index + 1}:`, JSON.stringify(row));
  }
});

// Exportar también a JSON para análisis más fácil
const outputPath = '/home/efraiprada/projects/OwnerIQ/backend/mortgage-calculator-sheet.json';
const fs = require('fs');
fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
console.log(`\n✅ Full sheet exported to: ${outputPath}`);
