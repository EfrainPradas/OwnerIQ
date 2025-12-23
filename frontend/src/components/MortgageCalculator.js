/**
 * Mortgage Calculator Component
 *
 * Displays complete amortization schedule, summary, and charts
 * for a property's mortgage
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { API_BASE_URL } from '../config';
import './MortgageCalculator.css';

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

// Use relative URLs in production (when API_BASE_URL is empty), localhost in development
const baseApiUrl = (API_BASE_URL || '').replace(/\/$/, '') || '';

function MortgageCalculator({ propertyId, property, onClose }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [yearlySummary, setYearlySummary] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // summary, schedule, charts
  const [editedFirstPaymentDate, setEditedFirstPaymentDate] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);

  console.log('📊 MortgageCalculator rendered - propertyId:', propertyId, 'property:', property);
  console.log('🎨 INLINE STYLES APPLIED - Version 2.0');

  useEffect(() => {
    if (propertyId) {
      console.log('🔄 Fetching mortgage data for propertyId:', propertyId);
      fetchMortgageData();
    }
  }, [propertyId]);

  useEffect(() => {
    if (summary && summary.first_payment_date) {
      setEditedFirstPaymentDate(summary.first_payment_date);
    }
  }, [summary]);

  const fetchMortgageData = async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await supabase.auth.session();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('🔍 Attempting to fetch mortgage summary...');

      // Try to fetch existing summary
      const summaryResponse = await fetch(`${baseApiUrl}/api/mortgage/summary/${propertyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📡 Response status:', summaryResponse.status);

      if (summaryResponse.status === 404) {
        // No schedule exists - generate it from property data
        console.log('⚠️ No mortgage schedule found. Generating from property data...');

        // Check for required mortgage fields (handle both naming conventions)
        const loanAmount = property.loan_amount;
        const interestRate = property.interest_rate || (property.loan_rate ? property.loan_rate / 100 : null);
        const termYears = property.term_years || property.loan_term;
        const firstPaymentDate = property.first_payment_date;

        console.log('🔍 Property mortgage fields:', {
          loan_amount: loanAmount,
          interest_rate: property.interest_rate,
          loan_rate: property.loan_rate,
          calculated_interestRate: interestRate,
          term_years: property.term_years,
          loan_term: property.loan_term,
          calculated_termYears: termYears,
          first_payment_date: firstPaymentDate
        });

        if (!loanAmount || !interestRate || !termYears || !firstPaymentDate) {
          console.log('❌ Missing required fields:', {
            hasLoanAmount: !!loanAmount,
            hasInterestRate: !!interestRate,
            hasTermYears: !!termYears,
            hasFirstPaymentDate: !!firstPaymentDate
          });
          setError('This property does not have complete mortgage information. Please add loan_amount, interest_rate (or loan_rate), term_years (or loan_term), and first_payment_date.');
          setLoading(false);
          return;
        }

        // Generate schedule
        console.log('📊 Generating amortization schedule...', {
          loanAmount,
          interestRate,
          termYears,
          firstPaymentDate
        });
        const generateResponse = await fetch(`${baseApiUrl}/api/mortgage/generate-schedule`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            propertyId: propertyId,
            loanAmount: loanAmount,
            annualInterestRate: interestRate,
            termYears: termYears,
            firstPaymentDate: firstPaymentDate,
            homeValue: property.home_value || property.current_value || property.valuation || null,
            yearlyPropertyTaxes: property.yearly_property_taxes || property.taxes || 0,
            yearlyHOI: property.yearly_hoi || property.insurance || 0,
            monthlyPMI: property.monthly_pmi || 0,
            taxBracket: 0.15 // Default tax bracket
          })
        });

        if (!generateResponse.ok) {
          const errorData = await generateResponse.json();
          throw new Error(`Failed to generate schedule: ${errorData.message || errorData.error}`);
        }

        console.log('✅ Schedule generated successfully! Now fetching data...');

        // Now fetch the newly generated data (recursive call)
        await fetchMortgageData();
        return;
      }

      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch mortgage summary');
      }

      const summaryData = await summaryResponse.json();
      console.log('✅ Mortgage summary fetched:', summaryData);
      setSummary(summaryData);

      // Fetch full schedule
      const scheduleResponse = await fetch(`${baseApiUrl}/api/mortgage/schedule/${propertyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        console.log(`✅ Schedule fetched: ${scheduleData.length} payments`);
        setSchedule(scheduleData);
      }

      // Fetch yearly summary
      const yearlyResponse = await fetch(`${baseApiUrl}/api/mortgage/yearly-summary/${propertyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (yearlyResponse.ok) {
        const yearlyData = await yearlyResponse.json();
        console.log(`✅ Yearly summary fetched: ${yearlyData.length} years`);
        setYearlySummary(yearlyData);
      }

    } catch (err) {
      console.error('❌ Error fetching mortgage data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    if (!value && value !== 0) return '-';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleRecalculate = async () => {
    if (!editedFirstPaymentDate || editedFirstPaymentDate === summary.first_payment_date) {
      return;
    }

    setIsRecalculating(true);
    setError(null);

    try {
      const session = await supabase.auth.session();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('🔄 Recalculating schedule with new first payment date:', editedFirstPaymentDate);

      // Generate new schedule with updated first payment date
      const generateResponse = await fetch(`${baseApiUrl}/api/mortgage/generate-schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          propertyId: propertyId,
          loanAmount: summary.loan_amount,
          annualInterestRate: summary.interest_rate,
          termYears: summary.term_years,
          firstPaymentDate: editedFirstPaymentDate,
          homeValue: property.home_value || property.current_value || property.valuation || null,
          yearlyPropertyTaxes: property.yearly_property_taxes || property.taxes || 0,
          yearlyHOI: property.yearly_hoi || property.insurance || 0,
          monthlyPMI: property.monthly_pmi || 0,
          taxBracket: summary.tax_bracket || 0.15
        })
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(`Failed to recalculate schedule: ${errorData.message || errorData.error}`);
      }

      console.log('✅ Schedule recalculated successfully! Fetching updated data...');

      // Fetch updated data
      await fetchMortgageData();

    } catch (err) {
      console.error('❌ Error recalculating schedule:', err);
      setError(err.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Filter schedule by year
  const getFilteredSchedule = () => {
    if (selectedYear === 'all') return schedule;
    return schedule.filter(payment => payment.payment_year === parseInt(selectedYear));
  };

  // Principal vs Interest Pie Chart
  const getPieChartData = () => {
    if (!summary) return null;

    return {
      labels: ['Principal', 'Interest'],
      datasets: [{
        data: [summary.total_principal, summary.total_interest],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#059669', '#dc2626'],
        borderWidth: 1
      }]
    };
  };

  // Yearly Principal vs Interest Bar Chart
  const getYearlyBarChartData = () => {
    if (yearlySummary.length === 0) return null;

    return {
      labels: yearlySummary.map(y => `Year ${y.year}`),
      datasets: [
        {
          label: 'Principal',
          data: yearlySummary.map(y => y.total_principal),
          backgroundColor: '#10b981',
          borderColor: '#059669',
          borderWidth: 1
        },
        {
          label: 'Interest',
          data: yearlySummary.map(y => y.total_interest),
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          borderWidth: 1
        }
      ]
    };
  };

  // Balance Over Time Line Chart
  const getBalanceLineChartData = () => {
    if (yearlySummary.length === 0) return null;

    return {
      labels: yearlySummary.map(y => `Year ${y.year}`),
      datasets: [
        {
          label: 'Loan Balance',
          data: yearlySummary.map(y => y.ending_balance),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  if (loading) {
    return (
      <div
        className="mortgage-calculator-overlay"
        style={{
          background: 'radial-gradient(1400px 900px at 20% -10%, #19224A 0%, #0B1020 40%)'
        }}
      >
        <div className="mortgage-calculator">
          <div className="mortgage-header">
            <div>
              <h2>🏠 Mortgage Calculator</h2>
              <p className="property-address">{property?.address || 'Property'}</p>
            </div>
            {onClose && (
              <button className="close-button" onClick={onClose} title="Close">
                ✕
              </button>
            )}
          </div>
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading mortgage data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="mortgage-calculator-overlay"
        style={{
          background: 'radial-gradient(1400px 900px at 20% -10%, #19224A 0%, #0B1020 40%)'
        }}
      >
        <div className="mortgage-calculator">
          <div className="mortgage-header">
            <div>
              <h2>🏠 Mortgage Calculator</h2>
              <p className="property-address">{property?.address || 'Property'}</p>
            </div>
            {onClose && (
              <button className="close-button" onClick={onClose} title="Close">
                ✕
              </button>
            )}
          </div>
          <div className="error-message">
            <p>⚠️ {error}</p>
            {property && property.loan_amount && (
              <p className="hint">
                Mortgage data may not have been generated yet. Try refreshing the page.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        className="mortgage-calculator-overlay"
        style={{
          background: 'radial-gradient(1400px 900px at 20% -10%, #19224A 0%, #0B1020 40%)'
        }}
      >
        <div className="mortgage-calculator">
          <div className="mortgage-header">
            <div>
              <h2>🏠 Mortgage Calculator</h2>
              <p className="property-address">{property?.address || 'Property'}</p>
            </div>
            {onClose && (
              <button className="close-button" onClick={onClose} title="Close">
                ✕
              </button>
            )}
          </div>
          <div className="no-data">
            <p>📊 No mortgage data available for this property</p>
            <p className="hint">Add loan information to generate amortization schedule</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mortgage-calculator-overlay"
      style={{
        background: 'radial-gradient(1400px 900px at 20% -10%, #19224A 0%, #0B1020 40%)'
      }}
    >
      <div className="mortgage-calculator">
        {/* Header */}
        <div className="mortgage-header">
          <div>
            <h2>🏠 Mortgage Calculator</h2>
            <p className="property-address">{property?.address || 'Property'}</p>
          </div>
          {onClose && (
            <button className="close-button" onClick={onClose} title="Close">
              ✕
            </button>
          )}
        </div>

      {/* Tabs */}
      <div className="mortgage-tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📊 Summary
        </button>
        <button
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          📋 Payment Schedule
        </button>
        <button
          className={`tab ${activeTab === 'charts' ? 'active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          📈 Charts
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="mortgage-summary">
          <div className="summary-grid">
            {/* Loan Details */}
            <div className="summary-card">
              <h3>💰 Loan Details</h3>
              <div className="summary-item">
                <span className="label">Loan Amount:</span>
                <span className="value">{formatCurrency(summary.loan_amount)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Interest Rate:</span>
                <span className="value">{formatPercent(summary.interest_rate)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Term:</span>
                <span className="value">{summary.term_years} years</span>
              </div>
              <div className="summary-item">
                <span className="label">First Payment:</span>
                <div className="editable-date-container">
                  <div className="editable-date">
                    <span>📅</span>
                    <input
                      type="date"
                      value={editedFirstPaymentDate}
                      onChange={(e) => setEditedFirstPaymentDate(e.target.value)}
                      disabled={isRecalculating}
                    />
                  </div>
                  {editedFirstPaymentDate !== summary.first_payment_date && !isRecalculating && (
                    <button
                      className="recalculate-btn"
                      onClick={handleRecalculate}
                      title="Recalculate schedule with new date"
                    >
                      🔄 Recalculate
                    </button>
                  )}
                  {isRecalculating && (
                    <div className="recalculating">
                      <div className="spinner-small"></div>
                      Recalculating...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Payments */}
            <div className="summary-card">
              <h3>📅 Monthly Payments</h3>
              <div className="summary-item">
                <span className="label">P&I Payment:</span>
                <span className="value highlight">{formatCurrency(summary.monthly_payment_pi)}</span>
              </div>
              <div className="summary-item">
                <span className="label">PITI Payment:</span>
                <span className="value highlight">{formatCurrency(summary.monthly_payment_piti)}</span>
              </div>
              <div className="summary-item small">
                <span className="label">Property Taxes:</span>
                <span className="value">{formatCurrency(summary.yearly_property_taxes / 12)}</span>
              </div>
              <div className="summary-item small">
                <span className="label">Insurance:</span>
                <span className="value">{formatCurrency(summary.yearly_hoi / 12)}</span>
              </div>
            </div>

            {/* Totals */}
            <div className="summary-card">
              <h3>💵 Totals Over Life of Loan</h3>
              <div className="summary-item">
                <span className="label">Total Payments:</span>
                <span className="value">{formatCurrency(summary.total_payments)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Total Interest:</span>
                <span className="value danger">{formatCurrency(summary.total_interest)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Total Principal:</span>
                <span className="value success">{formatCurrency(summary.total_principal)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Interest/Principal Ratio:</span>
                <span className="value">
                  {((summary.total_interest / summary.total_principal) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Tax Benefits */}
            <div className="summary-card">
              <h3>🎯 Tax Benefits</h3>
              <div className="summary-item">
                <span className="label">Tax Bracket:</span>
                <span className="value">{formatPercent(summary.tax_bracket)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Total Tax Returned:</span>
                <span className="value success">{formatCurrency(summary.total_tax_returned)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Effective Interest Rate:</span>
                <span className="value">{formatPercent(summary.effective_interest_rate)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Net Cost of Interest:</span>
                <span className="value">
                  {formatCurrency(summary.total_interest - summary.total_tax_returned)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-box">
              <div className="stat-value">{formatCurrency(summary.monthly_payment_pi)}</div>
              <div className="stat-label">Monthly P&I</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{summary.term_years * 12}</div>
              <div className="stat-label">Total Payments</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {((summary.total_interest / summary.loan_amount) * 100).toFixed(0)}%
              </div>
              <div className="stat-label">Interest as % of Loan</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {summary.home_value ? formatPercent(summary.loan_amount / summary.home_value) : '-'}
              </div>
              <div className="stat-label">Initial LTV</div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="mortgage-schedule">
          {/* Year Filter */}
          <div className="schedule-controls">
            <label htmlFor="year-filter">Filter by Year:</label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">All Years</option>
              {Array.from({ length: summary.term_years }, (_, i) => i + 1).map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
            <span className="showing-count">
              Showing {getFilteredSchedule().length} of {schedule.length} payments
            </span>
          </div>

          {/* Schedule Table */}
          <div className="schedule-table-container">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Year</th>
                  <th>Payment</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                  <th>LTV</th>
                  <th>Tax Saved</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredSchedule().map((payment) => (
                  <tr key={payment.payment_number} className={payment.payment_year === 1 && payment.payment_number === 1 ? 'first-payment' : ''}>
                    <td>{payment.payment_number}</td>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td>{payment.payment_year}</td>
                    <td className="amount">{formatCurrency(payment.payment_due)}</td>
                    <td className="amount success">{formatCurrency(payment.principal_paid)}</td>
                    <td className="amount danger">{formatCurrency(payment.interest_due)}</td>
                    <td className="amount bold">{formatCurrency(payment.balance)}</td>
                    <td>{payment.ltv ? formatPercent(payment.ltv) : '-'}</td>
                    <td className="amount">{formatCurrency(payment.tax_returned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="mortgage-charts">
          <div className="charts-grid">
            {/* Pie Chart */}
            <div className="chart-card">
              <h3>Principal vs Interest</h3>
              <div className="chart-container-pie">
                {getPieChartData() && (
                  <Pie
                    data={getPieChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.label || '';
                              const value = formatCurrency(context.raw);
                              const percent = ((context.raw / summary.total_payments) * 100).toFixed(1);
                              return `${label}: ${value} (${percent}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Yearly Bar Chart */}
            <div className="chart-card wide">
              <h3>Principal vs Interest by Year</h3>
              <div className="chart-container-bar">
                {getYearlyBarChartData() && (
                  <Bar
                    data={getYearlyBarChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                          }
                        }
                      },
                      scales: {
                        x: { stacked: false },
                        y: {
                          stacked: false,
                          ticks: {
                            callback: (value) => formatCurrency(value)
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Balance Line Chart */}
            <div className="chart-card wide">
              <h3>Loan Balance Over Time</h3>
              <div className="chart-container-line">
                {getBalanceLineChartData() && (
                  <Line
                    data={getBalanceLineChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                          callbacks: {
                            label: (context) => `Balance: ${formatCurrency(context.raw)}`
                          }
                        }
                      },
                      scales: {
                        y: {
                          ticks: {
                            callback: (value) => formatCurrency(value)
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default MortgageCalculator;
