import React, { useState, useEffect } from 'react';
import PropertyLookup from './PropertyLookup';

function MortgageCalculator() {
  // Borrower & Lender Info
  const [borrowerInfo, setBorrowerInfo] = useState({
    address: '',
    phone: ''
  });
  const [lenderInfo, setLenderInfo] = useState({
    address: '',
    phone: ''
  });

  // Purchase Data
  const [purchasePrice, setPurchasePrice] = useState(248000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(25);
  const [downPayment, setDownPayment] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);

  // Mortgage Information
  const [annualInterestRate, setAnnualInterestRate] = useState(7.125);
  const [termLength, setTermLength] = useState(30);
  const [firstPaymentDate, setFirstPaymentDate] = useState('2025-01-05');
  const [compoundPeriod, setCompoundPeriod] = useState('Monthly');
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly');

  // Property Details
  const [homeValue, setHomeValue] = useState(336000);
  const [yearlyPropertyTaxes, setYearlyPropertyTaxes] = useState(0);
  const [yearlyHOInsurance, setYearlyHOInsurance] = useState(0);
  const [monthlyPMI, setMonthlyPMI] = useState(0);

  // Income & Expenses
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState(0);
  const [vacancyRate, setVacancyRate] = useState(5); // percentage
  const [propertyTaxes, setPropertyTaxes] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [hoaFees, setHoaFees] = useState(0);
  const [propertyManagementFees, setPropertyManagementFees] = useState(0);
  const [maintenanceRepairs, setMaintenanceRepairs] = useState(0);
  const [capex, setCapex] = useState(0);
  const [electricity, setElectricity] = useState(0);
  const [waterSewer, setWaterSewer] = useState(0);
  const [lawnGroundKeeping, setLawnGroundKeeping] = useState(0);

  // Calculated values
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [effectiveGrossIncome, setEffectiveGrossIncome] = useState(0);
  const [netOperatingIncome, setNetOperatingIncome] = useState(0);
  const [capRate, setCapRate] = useState(0);
  const [cashFlowBeforeTax, setCashFlowBeforeTax] = useState(0);
  const [cashOnCashROI, setCashOnCashROI] = useState(0);
  const [debtCoverageRatio, setDebtCoverageRatio] = useState(0);
  const [operatingExpensesRatio, setOperatingExpensesRatio] = useState(0);
  const [rentToValueRatio, setRentToValueRatio] = useState(0);
  const [loanToValue, setLoanToValue] = useState(0);
  const [equity, setEquity] = useState(0);

  // Calculate down payment and loan amount when purchase price or down payment % changes
  useEffect(() => {
    const dp = purchasePrice * (downPaymentPercent / 100);
    setDownPayment(dp);
    setLoanAmount(purchasePrice - dp);
  }, [purchasePrice, downPaymentPercent]);

  // Calculate monthly mortgage payment
  useEffect(() => {
    if (loanAmount > 0 && annualInterestRate > 0 && termLength > 0) {
      const monthlyRate = annualInterestRate / 100 / 12;
      const numPayments = termLength * 12;
      const payment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                     (Math.pow(1 + monthlyRate, numPayments) - 1);
      setMonthlyPayment(payment);
      setTotalPayments(payment * numPayments);
      setTotalInterest(payment * numPayments - loanAmount);
    }
  }, [loanAmount, annualInterestRate, termLength]);

  // Calculate all financial metrics
  useEffect(() => {
    // Effective Gross Income (EGI) = Gross Income - Vacancy
    const vacancy = grossMonthlyIncome * 12 * (vacancyRate / 100);
    const egi = (grossMonthlyIncome * 12) - vacancy;
    setEffectiveGrossIncome(egi);

    // Total Operating Expenses (annual)
    const totalOpEx = propertyTaxes + insurance + (hoaFees * 12) + 
                      propertyManagementFees + maintenanceRepairs + capex + 
                      electricity + waterSewer + lawnGroundKeeping;

    // Net Operating Income (NOI) = EGI - Operating Expenses
    const noi = egi - totalOpEx;
    setNetOperatingIncome(noi);

    // Annual Debt Service (Mortgage P+I)
    const annualDebtService = monthlyPayment * 12;

    // Cap Rate = NOI / Purchase Price
    const capRateCalc = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
    setCapRate(capRateCalc);

    // Cash Flow Before Tax (CFBT) = NOI - Debt Service - CAPEX
    const cfbt = noi - annualDebtService - capex;
    setCashFlowBeforeTax(cfbt);

    // Cash on Cash ROI (COC) = CFBT / Initial Capital Investment (Down Payment)
    const coc = downPayment > 0 ? (cfbt / downPayment) * 100 : 0;
    setCashOnCashROI(coc);

    // Debt Coverage Ratio (DCR) = NOI / Debt Service
    const dcr = annualDebtService > 0 ? noi / annualDebtService : 0;
    setDebtCoverageRatio(dcr);

    // Operating Expenses Ratio (OER) = Operating Expenses / Gross Operating Income
    const oer = (grossMonthlyIncome * 12) > 0 ? (totalOpEx / (grossMonthlyIncome * 12)) * 100 : 0;
    setOperatingExpensesRatio(oer);

    // Rent to Value Ratio (R/V) = Gross Monthly Rental Income / Current Market Value
    const rvRatio = homeValue > 0 ? (grossMonthlyIncome / homeValue) * 100 : 0;
    setRentToValueRatio(rvRatio);

    // Loan to Value (LTV) = Loan / Purchase Price
    const ltv = purchasePrice > 0 ? (loanAmount / purchasePrice) * 100 : 0;
    setLoanToValue(ltv);

    // Equity / Appreciation = Market Value - Loan Balance
    const equityCalc = homeValue - loanAmount;
    setEquity(equityCalc);

  }, [grossMonthlyIncome, vacancyRate, propertyTaxes, insurance, hoaFees, 
      propertyManagementFees, maintenanceRepairs, capex, electricity, 
      waterSewer, lawnGroundKeeping, monthlyPayment, purchasePrice, 
      downPayment, loanAmount, homeValue]);

  // Function to populate from Zillow data
  const handleZillowDataImport = (zillowData) => {
    if (zillowData && zillowData.data) {
      const data = zillowData.data;
      
      // Set purchase price and home value
      if (data.price) setPurchasePrice(data.price);
      if (data.zestimate) setHomeValue(data.zestimate);
      
      // Set property taxes
      if (data.propertyTaxRate && data.price) {
        const annualTax = data.price * (data.propertyTaxRate / 100);
        setYearlyPropertyTaxes(annualTax);
        setPropertyTaxes(annualTax);
      }
      
      // Set insurance
      if (data.annualHomeownersInsurance) {
        setYearlyHOInsurance(data.annualHomeownersInsurance);
        setInsurance(data.annualHomeownersInsurance);
      }
      
      // Estimate monthly rent (1% rule)
      if (data.price) {
        const estimatedRent = data.price * 0.01;
        setGrossMonthlyIncome(estimatedRent);
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value, decimals = 2) => {
    return `${value.toFixed(decimals)}%`;
  };

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          color: 'var(--accent-primary)', 
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-calculator"></i>
          Home Mortgage Calculator
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
          Comprehensive real estate investment analysis tool
        </p>
      </div>

      {/* Property Lookup Integration */}
      <div className="card" style={{ padding: '20px', marginBottom: '30px', background: 'var(--panel-secondary)' }}>
        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-search" style={{ color: 'var(--accent-primary)' }}></i>
          Import Property Data from Zillow
        </h3>
        <PropertyLookup embedded={true} onDataImport={handleZillowDataImport} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Left Column */}
        <div>
          {/* Borrower & Lender Info */}
          <div className="card" style={{ padding: '25px', marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '10px' }}>
              <i className="fas fa-users" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
              Borrower & Lender Information
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--text-secondary)' }}>Borrower</h4>
              <input
                type="text"
                placeholder="Address, City, ST ZIP"
                value={borrowerInfo.address}
                onChange={(e) => setBorrowerInfo({...borrowerInfo, address: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
              <input
                type="text"
                placeholder="Phone"
                value={borrowerInfo.phone}
                onChange={(e) => setBorrowerInfo({...borrowerInfo, phone: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <h4 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--text-secondary)' }}>Lender</h4>
              <input
                type="text"
                placeholder="Address, City, ST ZIP"
                value={lenderInfo.address}
                onChange={(e) => setLenderInfo({...lenderInfo, address: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
              <input
                type="text"
                placeholder="Phone"
                value={lenderInfo.phone}
                onChange={(e) => setLenderInfo({...lenderInfo, phone: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Purchase Data */}
          <div className="card" style={{ padding: '25px', marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '10px' }}>
              <i className="fas fa-home" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
              Purchase Data
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Purchase Price
                </label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Down Payment %
                </label>
                <input
                  type="number"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Down Payment
                </label>
                <input
                  type="number"
                  value={downPayment}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-primary)',
                    color: 'var(--text-muted)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Loan Amount
                </label>
                <input
                  type="number"
                  value={loanAmount}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-primary)',
                    color: 'var(--text-muted)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mortgage Information */}
          <div className="card" style={{ padding: '25px', marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '10px' }}>
              <i className="fas fa-file-contract" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
              Mortgage Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={annualInterestRate}
                  onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Term Length (Years)
                </label>
                <input
                  type="number"
                  value={termLength}
                  onChange={(e) => setTermLength(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  First Payment Date
                </label>
                <input
                  type="date"
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Monthly Payment (P+I)
                </label>
                <input
                  type="text"
                  value={formatCurrency(monthlyPayment)}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-primary)',
                    color: 'var(--success)',
                    fontWeight: 'bold'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="card" style={{ padding: '25px', marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '10px' }}>
              <i className="fas fa-building" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
              Property Details
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Home Value / Market Price
                </label>
                <input
                  type="number"
                  value={homeValue}
                  onChange={(e) => setHomeValue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Yearly Property Taxes
                </label>
                <input
                  type="number"
                  value={yearlyPropertyTaxes}
                  onChange={(e) => setYearlyPropertyTaxes(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Yearly H.O. Insurance
                </label>
                <input
                  type="number"
                  value={yearlyHOInsurance}
                  onChange={(e) => setYearlyHOInsurance(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                  Monthly PMI
                </label>
                <input
                  type="number"
                  value={monthlyPMI}
                  onChange={(e) => setMonthlyPMI(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Income & Operating Expenses */}
          <div className="card" style={{ padding: '25px', marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--success)', paddingBottom: '10px' }}>
              <i className="fas fa-dollar-sign" style={{ marginRight: '8px', color: 'var(--success)' }}></i>
              Income & Operating Expenses
            </h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px', color: 'var(--success)' }}>
                Gross Monthly Income (Rent)
              </label>
              <input
                type="number"
                value={grossMonthlyIncome}
                onChange={(e) => setGrossMonthlyIncome(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '2px solid var(--success)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                Vacancy Rate (%)
              </label>
              <input
                type="number"
                value={vacancyRate}
                onChange={(e) => setVacancyRate(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <h4 style={{ fontSize: '16px', marginTop: '20px', marginBottom: '15px', color: 'var(--text-secondary)' }}>
              Annual Operating Expenses
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Property Taxes
                </label>
                <input
                  type="number"
                  value={propertyTaxes}
                  onChange={(e) => setPropertyTaxes(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Insurance
                </label>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  HOA Fees (Monthly)
                </label>
                <input
                  type="number"
                  value={hoaFees}
                  onChange={(e) => setHoaFees(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Property Management Fees
                </label>
                <input
                  type="number"
                  value={propertyManagementFees}
                  onChange={(e) => setPropertyManagementFees(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Maintenance & Repairs
                </label>
                <input
                  type="number"
                  value={maintenanceRepairs}
                  onChange={(e) => setMaintenanceRepairs(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  CAPEX (Capital Expenditures)
                </label>
                <input
                  type="number"
                  value={capex}
                  onChange={(e) => setCapex(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Electricity
                </label>
                <input
                  type="number"
                  value={electricity}
                  onChange={(e) => setElectricity(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Water / Sewer
                </label>
                <input
                  type="number"
                  value={waterSewer}
                  onChange={(e) => setWaterSewer(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                  Lawn / Ground Keeping
                </label>
                <input
                  type="number"
                  value={lawnGroundKeeping}
                  onChange={(e) => setLawnGroundKeeping(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Analysis Results */}
      <div className="card" style={{ padding: '30px', marginTop: '30px', background: 'linear-gradient(135deg, var(--panel-primary) 0%, var(--panel-secondary) 100%)' }}>
        <h2 style={{ 
          marginBottom: '30px', 
          fontSize: '28px',
          borderBottom: '3px solid var(--accent-primary)', 
          paddingBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-chart-line" style={{ color: 'var(--accent-primary)' }}></i>
          Financial Analysis & Key Metrics
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Effective Gross Income */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              EFFECTIVE GROSS INCOME (EGI)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
              {formatCurrency(effectiveGrossIncome)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Gross Income - Vacancy
            </div>
          </div>

          {/* Net Operating Income */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              NET OPERATING INCOME (NOI)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: netOperatingIncome >= 0 ? 'var(--success)' : 'var(--error)' }}>
              {formatCurrency(netOperatingIncome)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              EGI - Operating Expenses
            </div>
          </div>

          {/* Cap Rate */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--accent-primary)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              CAP RATE
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
              {formatPercent(capRate)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              NOI / Purchase Price
            </div>
          </div>

          {/* Cash Flow Before Tax */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              CASH FLOW BEFORE TAX (CFBT)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: cashFlowBeforeTax >= 0 ? 'var(--success)' : 'var(--error)' }}>
              {formatCurrency(cashFlowBeforeTax)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              NOI - Debt Service - CAPEX
            </div>
          </div>

          {/* Cash on Cash ROI */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--success)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              CASH ON CASH ROI (COC)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>
              {formatPercent(cashOnCashROI)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              CFBT / Down Payment
            </div>
          </div>

          {/* Debt Coverage Ratio */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              DEBT COVERAGE RATIO (DCR)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: debtCoverageRatio >= 1.25 ? 'var(--success)' : 'var(--warning)' }}>
              {debtCoverageRatio.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              NOI / Debt Service (P+I)
            </div>
          </div>

          {/* Operating Expenses Ratio */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              OPERATING EXPENSES RATIO (OER)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)' }}>
              {formatPercent(operatingExpensesRatio)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Op. Expenses / Gross Income
            </div>
          </div>

          {/* Rent to Value Ratio */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              RENT TO VALUE RATIO (R/V)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: rentToValueRatio >= 0.8 && rentToValueRatio <= 1 ? 'var(--success)' : 'var(--warning)' }}>
              {formatPercent(rentToValueRatio)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Monthly Rent / Market Value (Ideal: 0.8-1%)
            </div>
          </div>

          {/* Loan to Value */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              LOAN TO VALUE (LTV)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
              {formatPercent(loanToValue)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Loan / Purchase Price
            </div>
          </div>

          {/* Equity / Appreciation */}
          <div style={{ 
            padding: '20px', 
            background: 'var(--panel-secondary)', 
            borderRadius: '12px',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
              EQUITY / APPRECIATION
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
              {formatCurrency(equity)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Market Value - Loan Balance
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div style={{ 
          marginTop: '30px', 
          padding: '25px', 
          background: 'var(--panel-primary)', 
          borderRadius: '12px',
          border: '2px solid var(--accent-primary)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '20px', color: 'var(--accent-primary)' }}>
            <i className="fas fa-file-invoice-dollar" style={{ marginRight: '8px' }}></i>
            Mortgage Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                Monthly Payment (P+I)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {formatCurrency(monthlyPayment)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                Total Payments
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {formatCurrency(totalPayments)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                Total Interest
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warning)' }}>
                {formatCurrency(totalInterest)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                Years Until Paid Off
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {termLength} years
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: 'rgba(108, 138, 255, 0.1)', 
          borderRadius: '8px',
          borderLeft: '4px solid var(--accent-primary)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
            <strong>Notes:</strong> Operating Expenses do not include Debt Service. 
            If you buy cash, Cap Rate = COC. Ideal R/V Ratio is 0.8% - 1%. 
            Higher LTV means higher bank risk. DCR above 1.25 is generally preferred by lenders.
          </div>
        </div>
      </div>
    </div>
  );
}

export default MortgageCalculator;