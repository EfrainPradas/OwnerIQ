/**
 * HELOC Dashboard Component
 *
 * Comprehensive dashboard for managing property equity, HELOC lines,
 * and purchase scenarios using equity leverage
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { API_BASE_URL } from '../config';
import './HelocDashboard.css';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title
);

const baseApiUrl = (API_BASE_URL || '').replace(/\/$/, '') || '';

function HelocDashboard({ property, onClose }) {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('calculator'); // calculator, valuations, heloc-lines

  // Data state
  const [equitySummary, setEquitySummary] = useState([]);
  const [helocLines, setHelocLines] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [properties, setProperties] = useState([]);

  // Calculator state
  const [calculatorInputs, setCalculatorInputs] = useState({
    property_value: '',
    current_loan_balance: '',
    purchase_price: '',
    down_payment_percent: 20,
    new_mortgage_rate: 6.5,
    new_loan_term: 30,
    expected_monthly_rent: '',
    monthly_expenses: '',
    heloc_interest_rate: 7.5
  });
  const [calculatorResults, setCalculatorResults] = useState(null);

  // HELOC Line form state
  const [helocForm, setHelocForm] = useState({
    property_id: '',
    lender_name: '',
    account_number: '',
    open_date: new Date().toISOString().split('T')[0],
    max_credit_limit: '',
    available_credit: '',
    interest_rate: 7.5,
    rate_type: 'variable',
    minimum_monthly_payment: '',
    property_value_at_open: '',
    loan_balance_at_open: ''
  });

  // Property Valuation form state
  const [valuationForm, setValuationForm] = useState({
    property_id: '',
    valuation_date: new Date().toISOString().split('T')[0],
    market_value: '',
    valuation_source: 'manual',
    original_purchase_price: '',
    notes: ''
  });

  console.log('📊 HelocDashboard rendered with property:', property);

  useEffect(() => {
    if (property) {
      loadPropertyData();

      // Pre-populate calculator with property data
      const propertyValue = property.valuation || property.current_value || property.purchase_price || '';
      const loanBalance = property.loan_amount || '';
      const monthlyRent = property.rent || property.expected_rent || '';
      const interestRate = property.loan_rate || property.interest_rate || 7.5;
      const loanTerm = property.loan_term || property.loan_term_years || 30;

      console.log('📝 Pre-filling calculator with:', {
        propertyValue,
        loanBalance,
        monthlyRent,
        interestRate,
        loanTerm
      });

      setCalculatorInputs({
        property_value: propertyValue,
        current_loan_balance: loanBalance,
        purchase_price: '',
        down_payment_percent: 20,
        new_mortgage_rate: 6.5,
        new_loan_term: 30,
        expected_monthly_rent: monthlyRent,
        monthly_expenses: '',
        heloc_interest_rate: 7.5
      });
    }
  }, [property]);

  const loadPropertyData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading HELOC data for property:', property.property_id);

      // For now, just set empty arrays - tables might not exist yet
      setHelocLines([]);
      setScenarios([]);

      console.log('✅ Property HELOC dashboard ready (tables not created yet)');

    } catch (err) {
      console.error('❌ Error loading HELOC data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runCalculator = async () => {
    try {
      console.log('🧮 Running HELOC calculator with inputs:', calculatorInputs);

      // Parse inputs
      const propertyValue = parseFloat(calculatorInputs.property_value) || 0;
      const currentLoan = parseFloat(calculatorInputs.current_loan_balance) || 0;
      const helocRate = parseFloat(calculatorInputs.heloc_interest_rate) || 7.5;
      const purchasePrice = parseFloat(calculatorInputs.purchase_price) || 0;
      const downPaymentPct = parseFloat(calculatorInputs.down_payment_percent) || 20;
      const newMortgageRate = parseFloat(calculatorInputs.new_mortgage_rate) || 6.5;
      const loanTerm = parseFloat(calculatorInputs.new_loan_term) || 30;
      const monthlyRent = parseFloat(calculatorInputs.expected_monthly_rent) || 0;
      const monthlyExpenses = parseFloat(calculatorInputs.monthly_expenses) || 0;

      // Calculate available equity (80% LTV rule)
      const maxLoanValue = propertyValue * 0.80;
      const availableEquity = Math.max(0, maxLoanValue - currentLoan);

      // Calculate down payment needed
      const downPaymentRequired = purchasePrice * (downPaymentPct / 100);

      // Calculate new loan amount
      const newLoanAmount = purchasePrice - downPaymentRequired;

      // Calculate monthly payment for new mortgage (P&I only)
      const monthlyRate = (newMortgageRate / 100) / 12;
      const numPayments = loanTerm * 12;
      const monthlyPayment = newLoanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      // Calculate HELOC monthly payment (interest-only)
      const helocMonthlyPayment = (downPaymentRequired * (helocRate / 100)) / 12;

      // Calculate cash flow
      const totalMonthlyPayment = monthlyPayment + helocMonthlyPayment;
      const netMonthlyCashFlow = monthlyRent - monthlyExpenses - totalMonthlyPayment;
      const annualCashFlow = netMonthlyCashFlow * 12;

      // Calculate current equity
      const currentEquity = propertyValue - currentLoan;
      const ltv80 = propertyValue * 0.80;

      // Determine how much we can use from HELOC
      const helocDraw = Math.min(downPaymentRequired, availableEquity);
      const additionalCashNeeded = Math.max(0, downPaymentRequired - helocDraw);

      const results = {
        equity_analysis: {
          current_equity: currentEquity,
          available_heloc_equity: availableEquity,
          ltv_80_percent: ltv80
        },
        purchase_structure: {
          down_payment_needed: downPaymentRequired,
          heloc_draw: helocDraw,
          cash_needed: additionalCashNeeded,
          new_loan_amount: newLoanAmount
        },
        returns: {
          monthly_mortgage_payment: monthlyPayment,
          monthly_heloc_payment: helocMonthlyPayment,
          monthly_expenses: monthlyExpenses,
          monthly_rent: monthlyRent,
          monthly_cash_flow: netMonthlyCashFlow,
          annual_cash_flow: annualCashFlow,
          cash_on_cash_return: downPaymentRequired > 0 ? (annualCashFlow / downPaymentRequired) * 100 : 0
        },
        feasibility: {
          can_afford: availableEquity >= downPaymentRequired,
          equity_available: availableEquity,
          equity_needed: downPaymentRequired
        }
      };

      setCalculatorResults(results);
      console.log('✅ Calculator results:', results);

    } catch (err) {
      console.error('❌ Calculator error:', err);
      alert('Failed to run calculator: ' + err.message);
    }
  };

  const saveValuation = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${baseApiUrl}/api/heloc/valuations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(valuationForm)
      });

      if (!response.ok) {
        throw new Error('Failed to save valuation');
      }

      alert('✅ Property valuation saved!');
      loadPropertyData(); // Refresh data

      // Reset form
      setValuationForm({
        ...valuationForm,
        market_value: '',
        notes: ''
      });

    } catch (err) {
      console.error('❌ Save valuation error:', err);
      alert('Failed to save valuation: ' + err.message);
    }
  };

  const saveHelocLine = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${baseApiUrl}/api/heloc/lines`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(helocForm)
      });

      if (!response.ok) {
        throw new Error('Failed to save HELOC line');
      }

      alert('✅ HELOC line created!');
      loadPropertyData(); // Refresh data

    } catch (err) {
      console.error('❌ Save HELOC error:', err);
      alert('Failed to save HELOC line: ' + err.message);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    return (value * 100).toFixed(2) + '%';
  };

  if (loading) {
    return (
      <div className="heloc-dashboard-overlay">
        <div className="heloc-dashboard">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading HELOC Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="heloc-dashboard-overlay">
      <div className="heloc-dashboard">
        {/* Header */}
        <div className="heloc-header">
          <div>
            <h2>💰 HELOC Analysis</h2>
            <p className="property-address">
              {property?.address || 'Property'}
            </p>
          </div>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="heloc-tabs">
          <button
            className={`tab ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            🧮 HELOC Calculator
          </button>
          <button
            className={`tab ${activeTab === 'valuations' ? 'active' : ''}`}
            onClick={() => setActiveTab('valuations')}
          >
            📈 Valuations
          </button>
          <button
            className={`tab ${activeTab === 'heloc-lines' ? 'active' : ''}`}
            onClick={() => setActiveTab('heloc-lines')}
          >
            💳 HELOC Lines
          </button>
        </div>

        {/* Content */}
        <div className="calculator-form">
          {/* Equity Summary Tab */}
          {activeTab === 'equity-summary' && (
            <div>
              <h3 style={styles.sectionTitle}>Property Equity Overview</h3>

              {equitySummary.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No properties with equity data yet.</p>
                  <p>Add property valuations to see equity analysis.</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Property</th>
                        <th style={styles.th}>Purchase Price</th>
                        <th style={styles.th}>Current Value</th>
                        <th style={styles.th}>Appreciation</th>
                        <th style={styles.th}>Loan Balance</th>
                        <th style={styles.th}>Equity</th>
                        <th style={styles.th}>HELOC Capacity</th>
                        <th style={styles.th}>HELOC Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equitySummary.map((prop, idx) => (
                        <tr key={idx} style={styles.tr}>
                          <td style={styles.td}>{prop.address || 'N/A'}</td>
                          <td style={styles.td}>{formatCurrency(prop.original_purchase_price)}</td>
                          <td style={styles.td}>{formatCurrency(prop.current_market_value)}</td>
                          <td style={styles.td}>
                            {formatCurrency(prop.total_appreciation)}
                            <br/>
                            <small>({formatPercent(prop.appreciation_percent)})</small>
                          </td>
                          <td style={styles.td}>{formatCurrency(prop.current_loan_balance)}</td>
                          <td style={styles.td}>
                            <strong>{formatCurrency(prop.current_equity)}</strong>
                          </td>
                          <td style={styles.td}>
                            <strong style={{color: '#28a745'}}>
                              {formatCurrency(prop.available_heloc_equity)}
                            </strong>
                          </td>
                          <td style={styles.td}>
                            {prop.active_heloc_id ? (
                              <span style={{color: '#007bff'}}>
                                Active
                                <br/>
                                <small>Available: {formatCurrency(prop.heloc_available_credit)}</small>
                              </span>
                            ) : (
                              <span style={{color: '#6c757d'}}>None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div>
              {/* Source Property Section */}
              <div className="form-section">
                <h3>Source Property (Current)</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Current Property Value</label>
                    <input
                      type="number"
                      value={calculatorInputs.property_value}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, property_value: e.target.value})}
                      placeholder="400000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Current Loan Balance</label>
                    <input
                      type="number"
                      value={calculatorInputs.current_loan_balance}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, current_loan_balance: e.target.value})}
                      placeholder="200000"
                    />
                  </div>
                  <div className="form-group">
                    <label>HELOC Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculatorInputs.heloc_interest_rate}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, heloc_interest_rate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Target Property Section */}
              <div className="form-section">
                <h3>Target Property (New Purchase)</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Purchase Price</label>
                    <input
                      type="number"
                      value={calculatorInputs.purchase_price}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, purchase_price: e.target.value})}
                      placeholder="300000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Down Payment (%)</label>
                    <input
                      type="number"
                      value={calculatorInputs.down_payment_percent}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, down_payment_percent: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>New Mortgage Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculatorInputs.new_mortgage_rate}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, new_mortgage_rate: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Loan Term (years)</label>
                    <input
                      type="number"
                      value={calculatorInputs.new_loan_term}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, new_loan_term: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Income & Expenses Section */}
              <div className="form-section">
                <h3>Expected Income & Expenses</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Expected Monthly Rent</label>
                    <input
                      type="number"
                      value={calculatorInputs.expected_monthly_rent}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, expected_monthly_rent: e.target.value})}
                      placeholder="2800"
                    />
                  </div>
                  <div className="form-group">
                    <label>Monthly Expenses</label>
                    <input
                      type="number"
                      value={calculatorInputs.monthly_expenses}
                      onChange={(e) => setCalculatorInputs({...calculatorInputs, monthly_expenses: e.target.value})}
                      placeholder="800"
                    />
                  </div>
                </div>
              </div>

              <button onClick={runCalculator} className="calculate-button">
                🧮 Calculate HELOC Strategy
              </button>

              {/* Calculator Results */}
              {calculatorResults && (
                <div className="results-container">
                  <h3 className="results-title">📊 Analysis Results</h3>

                  <div className="results-grid">
                    {/* Equity Analysis Card */}
                    <div className="result-card">
                      <h4><span>💎</span> Equity Analysis</h4>
                      <div className="result-row">
                        <span>Current Equity:</span>
                        <strong>{formatCurrency(calculatorResults.equity_analysis.current_equity)}</strong>
                      </div>
                      <div className="result-row">
                        <span>Available for HELOC:</span>
                        <strong style={{color: '#10b981'}}>
                          {formatCurrency(calculatorResults.equity_analysis.available_heloc_equity)}
                        </strong>
                      </div>
                      <div className="result-row">
                        <span>80% LTV Value:</span>
                        <span>{formatCurrency(calculatorResults.equity_analysis.ltv_80_percent)}</span>
                      </div>
                    </div>

                    {/* Purchase Structure Card */}
                    <div className="result-card">
                      <h4><span>🏠</span> Purchase Structure</h4>
                      <div className="result-row">
                        <span>Down Payment Needed:</span>
                        <strong>{formatCurrency(calculatorResults.purchase_structure.down_payment_needed)}</strong>
                      </div>
                      <div className="result-row">
                        <span>From HELOC:</span>
                        <strong style={{color: '#6C8AFF'}}>
                          {formatCurrency(calculatorResults.purchase_structure.heloc_draw)}
                        </strong>
                      </div>
                      <div className="result-row">
                        <span>Additional Cash Needed:</span>
                        <strong>{formatCurrency(calculatorResults.purchase_structure.cash_needed)}</strong>
                      </div>
                      <div className="result-row">
                        <span>New Loan Amount:</span>
                        <span>{formatCurrency(calculatorResults.purchase_structure.new_loan_amount)}</span>
                      </div>
                    </div>

                    {/* Returns & Cash Flow Card */}
                    <div className="result-card">
                      <h4><span>💰</span> Returns & Cash Flow</h4>
                      <div className="result-row">
                        <span>Monthly Mortgage:</span>
                        <span>{formatCurrency(calculatorResults.returns.monthly_mortgage_payment)}</span>
                      </div>
                      <div className="result-row">
                        <span>Monthly HELOC Payment:</span>
                        <span>{formatCurrency(calculatorResults.returns.monthly_heloc_payment)}</span>
                      </div>
                      <div className="result-row">
                        <span>Monthly Expenses:</span>
                        <span>{formatCurrency(calculatorResults.returns.monthly_expenses)}</span>
                      </div>
                      <div className="result-row">
                        <span>Monthly Rent:</span>
                        <span>{formatCurrency(calculatorResults.returns.monthly_rent)}</span>
                      </div>
                      <div className="result-row result-row-highlight">
                        <span>Monthly Cash Flow:</span>
                        <strong style={{color: calculatorResults.returns.monthly_cash_flow >= 0 ? '#10b981' : '#ef4444'}}>
                          {formatCurrency(calculatorResults.returns.monthly_cash_flow)}
                        </strong>
                      </div>
                      <div className="result-row result-row-highlight">
                        <span>Annual Cash Flow:</span>
                        <strong style={{color: calculatorResults.returns.annual_cash_flow >= 0 ? '#10b981' : '#ef4444'}}>
                          {formatCurrency(calculatorResults.returns.annual_cash_flow)}
                        </strong>
                      </div>
                      <div className="result-row result-row-highlight">
                        <span>Cash-on-Cash Return:</span>
                        <strong style={{color: calculatorResults.returns.cash_on_cash_return >= 0 ? '#10b981' : '#ef4444'}}>
                          {formatPercent(calculatorResults.returns.cash_on_cash_return)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Feasibility Banner */}
                  <div className={`feasibility-banner ${calculatorResults.feasibility.can_afford ? 'success' : 'error'}`}>
                    <span className="icon">{calculatorResults.feasibility.can_afford ? '✅' : '❌'}</span>
                    <span>{calculatorResults.feasibility.can_afford ? 'Strategy is Feasible!' : 'Not Enough Equity Available'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HELOC Lines Tab */}
          {activeTab === 'heloc-lines' && (
            <div>
              <h3 style={styles.sectionTitle}>HELOC Lines of Credit</h3>

              {/* Existing HELOC Lines */}
              <div style={styles.helocLinesContainer}>
                {helocLines.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No HELOC lines yet.</p>
                    <p>Create a HELOC line below to start tracking equity leverage.</p>
                  </div>
                ) : (
                  helocLines.map((heloc) => (
                    <div key={heloc.heloc_id} style={styles.helocCard}>
                      <div style={styles.helocCardHeader}>
                        <h4 style={styles.helocCardTitle}>{heloc.lender_name || 'HELOC Line'}</h4>
                        <span style={heloc.status === 'active' ? styles.badgeActive : styles.badgeInactive}>
                          {heloc.status}
                        </span>
                      </div>
                      <div style={styles.helocCardBody}>
                        <div style={styles.helocRow}>
                          <span>Property:</span>
                          <span>{heloc.property_address || 'N/A'}</span>
                        </div>
                        <div style={styles.helocRow}>
                          <span>Credit Limit:</span>
                          <strong>{formatCurrency(heloc.max_credit_limit)}</strong>
                        </div>
                        <div style={styles.helocRow}>
                          <span>Available Credit:</span>
                          <strong style={{color: '#28a745'}}>{formatCurrency(heloc.available_credit)}</strong>
                        </div>
                        <div style={styles.helocRow}>
                          <span>Current Balance:</span>
                          <span>{formatCurrency(heloc.current_balance)}</span>
                        </div>
                        <div style={styles.helocRow}>
                          <span>Interest Rate:</span>
                          <span>{heloc.interest_rate}% {heloc.rate_type}</span>
                        </div>
                        <div style={styles.helocRow}>
                          <span>Opened:</span>
                          <span>{new Date(heloc.open_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New HELOC Line Form */}
              <div style={styles.formContainer}>
                <h4 style={styles.formTitle}>➕ Create New HELOC Line</h4>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Property</label>
                  <select
                    style={styles.input}
                    value={helocForm.property_id}
                    onChange={(e) => setHelocForm({...helocForm, property_id: e.target.value})}
                  >
                    <option value="">Select Property</option>
                    {properties.map((prop) => (
                      <option key={prop.property_id} value={prop.property_id}>
                        {prop.address || prop.property_id}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGridTwo}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lender Name</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={helocForm.lender_name}
                      onChange={(e) => setHelocForm({...helocForm, lender_name: e.target.value})}
                      placeholder="Wells Fargo"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Account Number</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={helocForm.account_number}
                      onChange={(e) => setHelocForm({...helocForm, account_number: e.target.value})}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Open Date</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={helocForm.open_date}
                      onChange={(e) => setHelocForm({...helocForm, open_date: e.target.value})}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Max Credit Limit</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={helocForm.max_credit_limit}
                      onChange={(e) => setHelocForm({...helocForm, max_credit_limit: e.target.value})}
                      placeholder="80000"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Available Credit</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={helocForm.available_credit}
                      onChange={(e) => setHelocForm({...helocForm, available_credit: e.target.value})}
                      placeholder="80000"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      style={styles.input}
                      value={helocForm.interest_rate}
                      onChange={(e) => setHelocForm({...helocForm, interest_rate: e.target.value})}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rate Type</label>
                    <select
                      style={styles.input}
                      value={helocForm.rate_type}
                      onChange={(e) => setHelocForm({...helocForm, rate_type: e.target.value})}
                    >
                      <option value="variable">Variable</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Property Value at Open</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={helocForm.property_value_at_open}
                      onChange={(e) => setHelocForm({...helocForm, property_value_at_open: e.target.value})}
                      placeholder="450000"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Loan Balance at Open</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={helocForm.loan_balance_at_open}
                      onChange={(e) => setHelocForm({...helocForm, loan_balance_at_open: e.target.value})}
                      placeholder="280000"
                    />
                  </div>
                </div>

                <button onClick={saveHelocLine} style={styles.saveButton}>
                  💾 Create HELOC Line
                </button>
              </div>
            </div>
          )}

          {/* Valuations Tab */}
          {activeTab === 'valuations' && (
            <div>
              <h3 style={styles.sectionTitle}>Add Property Valuation</h3>
              <p style={styles.subtitle}>
                Track property values over time to calculate equity and appreciation
              </p>

              <div style={styles.formContainer}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Property</label>
                  <select
                    style={styles.input}
                    value={valuationForm.property_id}
                    onChange={(e) => setValuationForm({...valuationForm, property_id: e.target.value})}
                  >
                    <option value="">Select Property</option>
                    {properties.map((prop) => (
                      <option key={prop.property_id} value={prop.property_id}>
                        {prop.address || prop.property_id}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGridTwo}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Valuation Date</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={valuationForm.valuation_date}
                      onChange={(e) => setValuationForm({...valuationForm, valuation_date: e.target.value})}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Market Value</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={valuationForm.market_value}
                      onChange={(e) => setValuationForm({...valuationForm, market_value: e.target.value})}
                      placeholder="450000"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Valuation Source</label>
                    <select
                      style={styles.input}
                      value={valuationForm.valuation_source}
                      onChange={(e) => setValuationForm({...valuationForm, valuation_source: e.target.value})}
                    >
                      <option value="manual">Manual Entry</option>
                      <option value="appraisal">Professional Appraisal</option>
                      <option value="zillow">Zillow Estimate</option>
                      <option value="refinance">Refinance Appraisal</option>
                      <option value="tax_assessment">Tax Assessment</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Original Purchase Price</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={valuationForm.original_purchase_price}
                      onChange={(e) => setValuationForm({...valuationForm, original_purchase_price: e.target.value})}
                      placeholder="350000"
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Notes</label>
                  <textarea
                    style={{...styles.input, minHeight: '80px'}}
                    value={valuationForm.notes}
                    onChange={(e) => setValuationForm({...valuationForm, notes: e.target.value})}
                    placeholder="Add any relevant notes about this valuation..."
                  />
                </div>

                <button onClick={saveValuation} style={styles.saveButton}>
                  💾 Save Valuation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline Styles
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '1400px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '2px solid #e9ecef',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px 12px 0 0',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#212529',
    fontWeight: '600',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6c757d',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  loading: {
    padding: '60px',
    textAlign: 'center',
    fontSize: '18px',
    color: '#6c757d',
  },
  error: {
    padding: '15px 30px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderBottom: '1px solid #f5c6cb',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '0 30px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6c757d',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.2s',
  },
  activeTab: {
    padding: '12px 20px',
    border: 'none',
    backgroundColor: '#ffffff',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px 8px 0 0',
    borderBottom: '3px solid #007bff',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#212529',
    marginTop: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6c757d',
    marginTop: 0,
    marginBottom: '24px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6c757d',
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    color: '#495057',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #dee2e6',
    color: '#212529',
  },
  tr: {
    transition: 'background-color 0.15s',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  formGridTwo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  formSection: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    marginTop: 0,
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  calculateButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '8px',
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '16px',
  },
  results: {
    marginTop: '32px',
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  resultsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#212529',
    marginTop: 0,
    marginBottom: '20px',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  resultCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  resultCardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#495057',
    marginTop: 0,
    marginBottom: '16px',
    borderBottom: '2px solid #007bff',
    paddingBottom: '8px',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f1f3f5',
    fontSize: '14px',
  },
  resultRowHighlight: {
    backgroundColor: '#f8f9fa',
    padding: '12px 8px',
    margin: '8px -8px 0',
    borderRadius: '4px',
    borderBottom: 'none',
  },
  feasibilityMessage: {
    padding: '12px',
    backgroundColor: '#e7f3ff',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '12px',
    color: '#004085',
  },
  warnings: {
    padding: '12px',
    backgroundColor: '#fff3cd',
    borderRadius: '6px',
    fontSize: '13px',
    marginTop: '12px',
    color: '#856404',
  },
  helocLinesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  helocCard: {
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  helocCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
  },
  helocCardTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
  },
  badgeActive: {
    padding: '4px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgeInactive: {
    padding: '4px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  helocCardBody: {
    padding: '16px',
  },
  helocRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    borderBottom: '1px solid #f1f3f5',
  },
  formContainer: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    marginTop: '20px',
  },
};

export default HelocDashboard;
