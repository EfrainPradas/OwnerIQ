# Mortgage Calculator Setup

## ✅ Implementation Complete!

The Mortgage Calculator has been successfully implemented in OwnerIQ. This document describes the setup and usage.

---

## 🗄️ Database Setup

### Step 1: Create Tables

Run the SQL script in your Supabase SQL Editor:

```bash
File: backend/create-mortgage-schedule-table.sql
```

Or go to: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`

And execute the SQL to create:
- `mortgage_payment_schedule` table (stores 360 payment rows per property)
- `mortgage_summary` table (stores totals and summary data)

---

## 📊 Features Implemented

### Backend (✅ Complete)

1. **Calculation Functions** (`backend/utils/mortgage-calculator.js`):
   - `calculateMonthlyPayment()` - Calculate monthly P&I payment
   - `calculatePITI()` - Calculate full PITI payment
   - `generateAmortizationSchedule()` - Generate complete 360-payment schedule
   - `calculateBalanceAtYear()` - Calculate balance at specific year
   - `calculateYearlySummary()` - Group payments by year

2. **API Endpoints** (`backend/routes/mortgage.js`):
   - `POST /api/mortgage/calculate-payment` - Calculate monthly payment
   - `POST /api/mortgage/calculate-piti` - Calculate PITI
   - `POST /api/mortgage/generate-schedule` - Generate and save schedule
   - `GET /api/mortgage/schedule/:propertyId` - Get payment schedule
   - `GET /api/mortgage/summary/:propertyId` - Get mortgage summary
   - `GET /api/mortgage/yearly-summary/:propertyId` - Get yearly summary
   - `DELETE /api/mortgage/schedule/:propertyId` - Delete schedule

3. **Automatic Schedule Generation**:
   - When a property is created with mortgage data (loan_amount, interest_rate, term_years, first_payment_date), the amortization schedule is automatically generated and saved.
   - Modified `POST /api/properties` endpoint in `backend/routes/clients.js` (lines 1392-1454)

---

## 🔢 Mortgage Calculations

### Monthly Payment Formula

```javascript
M = P × [r(1 + r)^n] / [(1 + r)^n - 1]

Where:
- M = Monthly Payment
- P = Principal (Loan Amount)
- r = Monthly Interest Rate (Annual Rate / 12)
- n = Number of Payments (Years × 12)
```

### PITI Calculation

```javascript
PITI = Monthly P&I + (Yearly Taxes / 12) + (Yearly Insurance / 12) + Monthly PMI
```

### Each Payment Breakdown

```javascript
Interest Due = Previous Balance × Monthly Rate
Principal Paid = Monthly Payment - Interest Due
New Balance = Previous Balance - Principal Paid
LTV = New Balance / Home Value
```

---

## 📋 Payment Schedule Structure

Each payment in the schedule contains:

```javascript
{
  payment_number: 1-360,
  payment_date: "2024-06-01",
  payment_year: 1-30,
  interest_rate: 0.075,
  interest_due: 1006.25,
  payment_due: 1125.74,
  extra_payments: 0,
  principal_paid: 119.49,
  balance: 160880.51,
  ltv: 0.6760,
  tax_returned: 150.94,
  cumulative_tax_returned: 150.94
}
```

---

## 🚀 Usage Examples

### Creating a Property with Mortgage

When you create a property through the bulk upload or manual entry, if it includes:
- `loan_amount`
- `interest_rate`
- `term_years`
- `first_payment_date`

The amortization schedule will be **automatically generated** and saved to the database.

### Fetching Schedule

```javascript
// Get all payments
GET /api/mortgage/schedule/PROPERTY_ID

// Get payments for specific year
GET /api/mortgage/schedule/PROPERTY_ID?year=1

// Get first 12 payments
GET /api/mortgage/schedule/PROPERTY_ID?limit=12

// Get summary
GET /api/mortgage/summary/PROPERTY_ID

// Get yearly breakdown
GET /api/mortgage/yearly-summary/PROPERTY_ID
```

### Manually Generate Schedule

```javascript
POST /api/mortgage/generate-schedule
{
  "propertyId": "uuid",
  "loanAmount": 161000,
  "annualInterestRate": 0.075,
  "termYears": 30,
  "firstPaymentDate": "2024-06-01",
  "homeValue": 230000,
  "yearlyPropertyTaxes": 335.92,
  "yearlyHOI": 42.83,
  "monthlyPMI": 0,
  "taxBracket": 0.15
}
```

---

## 📈 Example Data

Based on the Excel file analyzed:

**Loan Details:**
- Loan Amount: $161,000
- Interest Rate: 7.5%
- Term: 30 years
- First Payment: June 1, 2024
- Monthly P&I: $1,125.74

**Summary:**
- Total Payments: $405,260.14
- Total Interest: $244,260.14
- Total Principal: $161,000
- Tax Benefit (15%): $36,639.02

**First Payment Breakdown:**
- Interest: $1,006.25
- Principal: $119.49
- Balance: $160,880.51
- LTV: 67.60%

---

## ⏭️ Next Steps (Frontend)

The following components need to be created:

1. **Amortization Schedule Table** - Display all 360 payments
2. **Mortgage Summary Card** - Show totals and key metrics
3. **Charts**:
   - Principal vs Interest by year
   - Balance over time
   - Equity build-up
4. **Filters** - By year, by date range
5. **Extra Payment Simulator** - Calculate payoff with extra payments

---

## 🧪 Testing

Test the implementation by:

1. Creating a property with mortgage data
2. Checking the `mortgage_payment_schedule` table in Supabase
3. Calling the API endpoints to fetch schedule
4. Verifying calculations match Excel formulas

---

## 📝 Notes

- The schedule generation is **non-blocking** - if it fails, the property still gets created
- Uses 15% tax bracket by default (can be customized)
- Supports extra payments (currently set to $0)
- All monetary values are rounded to 2 decimals
- Dates are stored in ISO format (YYYY-MM-DD)
- Schedule is stored in batches of 100 to avoid Supabase limits

---

## 🎯 Status

✅ Database tables created
✅ Backend calculation functions implemented
✅ API endpoints implemented
✅ Automatic schedule generation on property creation
⏳ Frontend components (next step)
