/**
 * Mortgage Calculator Utilities
 *
 * Implements all mortgage calculations including:
 * - Monthly payment calculation
 * - Complete amortization schedule generation
 * - PITI calculation
 * - Tax benefits calculation
 */

/**
 * Calculate monthly mortgage payment (Principal + Interest)
 *
 * Formula: M = P × [r(1 + r)^n] / [(1 + r)^n - 1]
 *
 * @param {number} loanAmount - Principal loan amount
 * @param {number} annualInterestRate - Annual interest rate (e.g., 0.075 for 7.5%)
 * @param {number} termYears - Loan term in years (e.g., 30)
 * @returns {number} Monthly payment amount
 */
function calculateMonthlyPayment(loanAmount, annualInterestRate, termYears) {
  if (!loanAmount || !annualInterestRate || !termYears) {
    throw new Error('Missing required parameters for monthly payment calculation');
  }

  const monthlyRate = annualInterestRate / 12;
  const numberOfPayments = termYears * 12;

  // M = P × [r(1 + r)^n] / [(1 + r)^n - 1]
  const factor = Math.pow(1 + monthlyRate, numberOfPayments);
  const monthlyPayment = loanAmount * (monthlyRate * factor) / (factor - 1);

  return Math.round(monthlyPayment * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate PITI (Principal, Interest, Taxes, Insurance)
 *
 * @param {number} monthlyPaymentPI - Monthly Principal + Interest payment
 * @param {number} yearlyPropertyTaxes - Annual property taxes
 * @param {number} yearlyHOI - Annual homeowner's insurance
 * @param {number} monthlyPMI - Monthly PMI (Private Mortgage Insurance)
 * @returns {number} Total monthly PITI payment
 */
function calculatePITI(monthlyPaymentPI, yearlyPropertyTaxes = 0, yearlyHOI = 0, monthlyPMI = 0) {
  const monthlyTaxes = yearlyPropertyTaxes / 12;
  const monthlyHOI = yearlyHOI / 12;

  const piti = monthlyPaymentPI + monthlyTaxes + monthlyHOI + monthlyPMI;

  return Math.round(piti * 100) / 100; // Round to 2 decimals
}

/**
 * Convert Excel serial date to JavaScript Date
 * Excel serial dates are days since 1899-12-30
 *
 * @param {number} serial - Excel serial date number
 * @returns {Date} JavaScript Date object
 */
function excelSerialToDate(serial) {
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + serial * msPerDay);
}

/**
 * Convert JavaScript Date to Excel serial date
 *
 * @param {Date} date - JavaScript Date object
 * @returns {number} Excel serial date number
 */
function dateToExcelSerial(date) {
  const excelEpoch = new Date(1899, 11, 30);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = date.getTime() - excelEpoch.getTime();
  return Math.floor(diff / msPerDay);
}

/**
 * Add months to a date
 *
 * @param {Date} date - Starting date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
function addMonths(date, months) {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

/**
 * Generate complete amortization schedule
 *
 * @param {Object} params - Calculation parameters
 * @param {number} params.loanAmount - Principal loan amount
 * @param {number} params.annualInterestRate - Annual interest rate (e.g., 0.075)
 * @param {number} params.termYears - Loan term in years
 * @param {Date|number} params.firstPaymentDate - First payment date (Date object or Excel serial)
 * @param {number} params.homeValue - Property value (for LTV calculation)
 * @param {number} params.taxBracket - Tax bracket for deduction calculation (default: 0.15)
 * @param {number} params.extraPayment - Optional extra payment each period (default: 0)
 * @param {number} params.extraPaymentStartAt - Payment number to start extra payments (default: 1)
 * @returns {Object} { schedule: Array, summary: Object }
 */
function generateAmortizationSchedule({
  loanAmount,
  annualInterestRate,
  termYears,
  firstPaymentDate,
  homeValue = null,
  taxBracket = 0.15,
  extraPayment = 0,
  extraPaymentStartAt = 1
}) {
  // Validate inputs
  if (!loanAmount || !annualInterestRate || !termYears || !firstPaymentDate) {
    throw new Error('Missing required parameters for amortization schedule');
  }

  // Convert firstPaymentDate to Date if it's an Excel serial
  const startDate = typeof firstPaymentDate === 'number'
    ? excelSerialToDate(firstPaymentDate)
    : new Date(firstPaymentDate);

  const monthlyRate = annualInterestRate / 12;
  const numberOfPayments = termYears * 12;
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualInterestRate, termYears);

  const schedule = [];
  let balance = loanAmount;
  let cumulativeTaxReturned = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  // Generate each payment
  for (let paymentNum = 1; paymentNum <= numberOfPayments; paymentNum++) {
    // If balance is paid off, stop
    if (balance <= 0) {
      break;
    }

    // Calculate payment date
    const paymentDate = addMonths(startDate, paymentNum - 1);
    const paymentYear = Math.ceil(paymentNum / 12);

    // Calculate interest due this period
    const interestDue = balance * monthlyRate;

    // Calculate extra payment (if applicable)
    const extraPaymentAmount = paymentNum >= extraPaymentStartAt ? extraPayment : 0;

    // Calculate principal paid
    let principalPaid = monthlyPayment - interestDue + extraPaymentAmount;

    // Ensure we don't overpay
    if (principalPaid > balance) {
      principalPaid = balance;
    }

    // Calculate new balance
    const newBalance = balance - principalPaid;

    // Calculate LTV (if home value provided)
    const ltv = homeValue ? newBalance / homeValue : null;

    // Calculate tax benefit
    const taxReturned = interestDue * taxBracket;
    cumulativeTaxReturned += taxReturned;

    // Track totals
    totalInterestPaid += interestDue;
    totalPrincipalPaid += principalPaid;

    // Add payment to schedule
    schedule.push({
      payment_number: paymentNum,
      payment_date: paymentDate,
      payment_year: paymentYear,
      interest_rate: annualInterestRate,
      interest_due: Math.round(interestDue * 100) / 100,
      payment_due: Math.round(monthlyPayment * 100) / 100,
      extra_payments: Math.round(extraPaymentAmount * 100) / 100,
      principal_paid: Math.round(principalPaid * 100) / 100,
      balance: Math.round(newBalance * 100) / 100,
      ltv: ltv ? Math.round(ltv * 1000000) / 1000000 : null,
      tax_returned: Math.round(taxReturned * 100) / 100,
      cumulative_tax_returned: Math.round(cumulativeTaxReturned * 100) / 100
    });

    // Update balance for next iteration
    balance = newBalance;
  }

  // Calculate summary
  const actualPayments = schedule.length;
  const lastPayment = schedule[schedule.length - 1];
  const lastPaymentDate = lastPayment.payment_date;

  const summary = {
    loan_amount: loanAmount,
    interest_rate: annualInterestRate,
    term_years: termYears,
    first_payment_date: startDate,
    monthly_payment_pi: monthlyPayment,
    home_value: homeValue,
    total_payments: Math.round((totalInterestPaid + totalPrincipalPaid) * 100) / 100,
    total_interest: Math.round(totalInterestPaid * 100) / 100,
    total_principal: Math.round(totalPrincipalPaid * 100) / 100,
    tax_bracket: taxBracket,
    total_tax_returned: Math.round(cumulativeTaxReturned * 100) / 100,
    effective_interest_rate: annualInterestRate * (1 - taxBracket),
    actual_number_of_payments: actualPayments,
    last_payment_date: lastPaymentDate
  };

  return {
    schedule,
    summary
  };
}

/**
 * Calculate balance at a specific year
 *
 * @param {number} loanAmount - Principal loan amount
 * @param {number} annualInterestRate - Annual interest rate
 * @param {number} termYears - Loan term in years
 * @param {number} atYear - Year to calculate balance at
 * @returns {Object} { balance, interestPaid, principalPaid }
 */
function calculateBalanceAtYear(loanAmount, annualInterestRate, termYears, atYear) {
  const monthlyRate = annualInterestRate / 12;
  const numberOfPayments = termYears * 12;
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualInterestRate, termYears);

  let balance = loanAmount;
  let totalInterest = 0;
  let totalPrincipal = 0;

  const paymentsToCalculate = atYear * 12;

  for (let i = 1; i <= paymentsToCalculate && i <= numberOfPayments; i++) {
    const interestDue = balance * monthlyRate;
    const principalPaid = monthlyPayment - interestDue;

    balance -= principalPaid;
    totalInterest += interestDue;
    totalPrincipal += principalPaid;
  }

  return {
    balance: Math.round(balance * 100) / 100,
    interestPaid: Math.round(totalInterest * 100) / 100,
    principalPaid: Math.round(totalPrincipal * 100) / 100
  };
}

/**
 * Calculate yearly summary from schedule
 * Groups payments by year and calculates totals
 *
 * @param {Array} schedule - Complete amortization schedule
 * @returns {Array} Yearly summary
 */
function calculateYearlySummary(schedule) {
  const yearlyData = {};

  schedule.forEach(payment => {
    const year = payment.payment_year;

    if (!yearlyData[year]) {
      yearlyData[year] = {
        year,
        payments: 0,
        total_interest: 0,
        total_principal: 0,
        total_payment: 0,
        ending_balance: 0,
        tax_returned: 0
      };
    }

    yearlyData[year].payments += 1;
    yearlyData[year].total_interest += payment.interest_due;
    yearlyData[year].total_principal += payment.principal_paid;
    yearlyData[year].total_payment += payment.payment_due;
    yearlyData[year].ending_balance = payment.balance;
    yearlyData[year].tax_returned += payment.tax_returned;
  });

  // Convert to array and round values
  return Object.values(yearlyData).map(year => ({
    ...year,
    total_interest: Math.round(year.total_interest * 100) / 100,
    total_principal: Math.round(year.total_principal * 100) / 100,
    total_payment: Math.round(year.total_payment * 100) / 100,
    ending_balance: Math.round(year.ending_balance * 100) / 100,
    tax_returned: Math.round(year.tax_returned * 100) / 100
  }));
}

module.exports = {
  calculateMonthlyPayment,
  calculatePITI,
  generateAmortizationSchedule,
  calculateBalanceAtYear,
  calculateYearlySummary,
  excelSerialToDate,
  dateToExcelSerial,
  addMonths
};
