const XLSX = require('xlsx');

const excelPath = '/mnt/c/OwnerIQ/excel/131 Redwood Track Course - Mortgage-Refinance MAY-2024.xlsx';

console.log('📊 Analyzing MortgageCalculator Sheet...\n');

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['MortgageCalculator'];
const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

// PARTE 1: INPUTS DEL MORTGAGE
console.log('=' .repeat(100));
console.log('PARTE 1: MORTGAGE INPUTS');
console.log('=' .repeat(100));

const inputs = {
  loanAmount: jsonData[7][4],
  interestRate: jsonData[8][4],
  termYears: jsonData[9][4],
  firstPaymentDate: jsonData[10][4],
  compoundPeriod: jsonData[11][4],
  paymentFrequency: jsonData[12][4],
  monthlyPayment: jsonData[13][4],
  homeValue: jsonData[15][4],
  yearlyPropertyTaxes: jsonData[16][4],
  yearlyHOI: jsonData[17][4],
  monthlyPMI: jsonData[18][4],
  pitiPayment: jsonData[19][4]
};

console.log('📋 Input Values:');
console.log(JSON.stringify(inputs, null, 2));

// PARTE 2: PAYMENT SCHEDULE HEADER
console.log('\n' + '='.repeat(100));
console.log('PARTE 2: PAYMENT SCHEDULE STRUCTURE');
console.log('=' .repeat(100));

// La fila 46 (índice 46) es el header del Payment Schedule
const headerRow = jsonData[46];
console.log('\n📋 Payment Schedule Headers (Row 47):');
headerRow.forEach((header, index) => {
  if (header) {
    console.log(`  Column ${index}: ${header}`);
  }
});

// PARTE 3: ANALIZAR PRIMEROS 12 PAGOS
console.log('\n' + '='.repeat(100));
console.log('PARTE 3: PRIMEROS 12 PAGOS (Año 1)');
console.log('=' .repeat(100));

console.log('\nAnalizando cálculos de amortización...\n');

for (let i = 48; i < 60; i++) {
  const row = jsonData[i];

  const payment = {
    no: row[0],
    paymentDate: row[1],
    year: row[2],
    interestRate: row[3],
    interestDue: row[4],
    paymentDue: row[5],
    extraPayments: row[6],
    additionalPayment: row[7],
    principalPaid: row[8],
    balance: row[9],
    taxReturned: row[10],
    cumulativeTaxReturned: row[11],
    ltv: row[12]
  };

  console.log(`Payment #${payment.no}:`);
  console.log(`  Date: ${payment.paymentDate} (Excel Serial)`);
  console.log(`  Year: ${payment.year || 'same year'}`);
  console.log(`  Interest Rate: ${(payment.interestRate * 100).toFixed(2)}%`);
  console.log(`  Interest Due: $${payment.interestDue?.toFixed(2)}`);
  console.log(`  Payment Due: $${payment.paymentDue?.toFixed(2)}`);
  console.log(`  Principal Paid: $${payment.principalPaid?.toFixed(2)}`);
  console.log(`  Remaining Balance: $${payment.balance?.toFixed(2)}`);
  console.log(`  LTV: ${(payment.ltv * 100).toFixed(2)}%`);

  // Verificar fórmula de interés mensual
  if (i === 48) {
    const expectedInterest = inputs.loanAmount * (inputs.interestRate / 12);
    console.log(`  ✅ Interest Formula Check: Balance × (Annual Rate / 12)`);
    console.log(`     = $${inputs.loanAmount} × (${inputs.interestRate} / 12)`);
    console.log(`     = $${expectedInterest.toFixed(2)}`);
    console.log(`     Excel shows: $${payment.interestDue?.toFixed(2)}`);
    console.log(`     Match: ${Math.abs(expectedInterest - payment.interestDue) < 0.01 ? '✅ YES' : '❌ NO'}`);
  }

  if (i > 48) {
    const prevBalance = jsonData[i - 1][9];
    const expectedInterest = prevBalance * (inputs.interestRate / 12);
    console.log(`  ✅ Interest: $${prevBalance.toFixed(2)} × ${(inputs.interestRate / 12).toFixed(6)} = $${expectedInterest.toFixed(2)}`);
  }

  console.log('');
}

// PARTE 4: FÓRMULAS Y CÁLCULOS
console.log('=' .repeat(100));
console.log('PARTE 4: FÓRMULAS CLAVE');
console.log('=' .repeat(100));

console.log(`
📐 FÓRMULAS IDENTIFICADAS:

1. Monthly Interest Rate:
   r = Annual Rate / 12
   r = ${inputs.interestRate} / 12 = ${(inputs.interestRate / 12).toFixed(6)}

2. Number of Payments:
   n = Term Years × 12
   n = ${inputs.termYears} × 12 = ${inputs.termYears * 12}

3. Monthly Payment (P&I):
   M = P × [r(1 + r)^n] / [(1 + r)^n - 1]
   Where P = Loan Amount, r = Monthly Rate, n = Number of Payments

   Calculated M = $${inputs.monthlyPayment}

4. Each Payment Calculation:
   - Interest Due = Previous Balance × Monthly Rate
   - Principal Paid = Monthly Payment - Interest Due
   - New Balance = Previous Balance - Principal Paid

5. LTV (Loan-to-Value):
   LTV = Current Balance / Home Value
   LTV = Balance / $${inputs.homeValue}

6. PITI (Principal, Interest, Taxes, Insurance):
   PITI = Monthly Payment + (Yearly Taxes / 12) + (Yearly HOI / 12) + Monthly PMI
   PITI = $${inputs.monthlyPayment} + ($${inputs.yearlyPropertyTaxes} / 12) + ($${inputs.yearlyHOI} / 12) + $${inputs.monthlyPMI}
   PITI = $${inputs.pitiPayment}
`);

// PARTE 5: RESUMEN
console.log('=' .repeat(100));
console.log('PARTE 5: RESUMEN Y DATOS CLAVE');
console.log('=' .repeat(100));

const summaryRow = {
  totalPayments: jsonData[34][4],
  totalInterest: jsonData[35][4]
};

console.log(`
📊 RESUMEN DEL PRÉSTAMO:
  - Loan Amount: $${inputs.loanAmount?.toLocaleString()}
  - Interest Rate: ${(inputs.interestRate * 100).toFixed(2)}%
  - Term: ${inputs.termYears} years (${inputs.termYears * 12} payments)
  - Monthly P&I Payment: $${inputs.monthlyPayment?.toFixed(2)}
  - Monthly PITI Payment: $${inputs.pitiPayment?.toFixed(2)}
  - First Payment Date: ${inputs.firstPaymentDate} (Excel serial number)

  - Total Payments: $${summaryRow.totalPayments?.toLocaleString()}
  - Total Interest: $${summaryRow.totalInterest?.toLocaleString()}

  - Home Value: $${inputs.homeValue?.toLocaleString()}
  - Initial LTV: ${((inputs.loanAmount / inputs.homeValue) * 100).toFixed(2)}%
`);

console.log('\n✅ Analysis Complete!\n');
