import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PropertyCommandCenter.css';

const MortgageDetails = ({ propertyId, onNavigate }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    lender_name: '',
    servicer_name: '',
    loan_number: '',
    closing_date: '',
    loan_amount: '',
    interest_rate: '',
    term_months: '',
    first_payment_date: '',
    maturity_date: '',
    principal_interest_monthly: '',
    property_taxes_monthly: '',
    insurance_monthly: '',
    hoa_monthly: '',
    pmi_monthly: '',
    other_monthly: '',
    ytd_principal_paid: '',
    ytd_interest_paid: '',
    current_balance: ''
  });

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const token = (await supabase.auth.session()).data.session?.access_token;

      const response = await fetch(`/api/properties/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const propertyData = await response.json();
        setProperty(propertyData);
        setFormData({
          lender_name: propertyData.lender_name || '',
          servicer_name: propertyData.servicer_name || '',
          loan_number: propertyData.loan_number || '',
          closing_date: propertyData.closing_date || '',
          loan_amount: propertyData.loan_amount || '',
          interest_rate: propertyData.interest_rate || propertyData.loan_rate || '',
          term_months: propertyData.term_months || (propertyData.term_years ? propertyData.term_years * 12 : ''),
          first_payment_date: propertyData.first_payment_date || '',
          maturity_date: propertyData.maturity_date || '',
          principal_interest_monthly: propertyData.principal_interest_monthly || propertyData.monthly_payment_principal_interest || '',
          property_taxes_monthly: propertyData.property_taxes_monthly || propertyData.escrow_property_tax ? propertyData.escrow_property_tax / 12 : '',
          insurance_monthly: propertyData.insurance_monthly || propertyData.escrow_home_owner_insurance ? propertyData.escrow_home_owner_insurance / 12 : '',
          hoa_monthly: propertyData.hoa_monthly || propertyData.hoa || '',
          pmi_monthly: propertyData.pmi_monthly || '',
          other_monthly: propertyData.other_monthly || '',
          ytd_principal_paid: propertyData.ytd_principal_paid || '',
          ytd_interest_paid: propertyData.ytd_interest_paid || '',
          current_balance: propertyData.current_balance || ''
        });
      }
    } catch (error) {
      console.error('Error loading property data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPayment = () => {
    const principalInterest = parseFloat(formData.principal_interest_monthly) || 0;
    const taxes = parseFloat(formData.property_taxes_monthly) || 0;
    const insurance = parseFloat(formData.insurance_monthly) || 0;
    const hoa = parseFloat(formData.hoa_monthly) || 0;
    const pmi = parseFloat(formData.pmi_monthly) || 0;
    const other = parseFloat(formData.other_monthly) || 0;

    return principalInterest + taxes + insurance + hoa + pmi + other;
  };

  const calculateYTDPaid = () => {
    const principal = parseFloat(formData.ytd_principal_paid) || 0;
    const interest = parseFloat(formData.ytd_interest_paid) || 0;
    return principal + interest;
  };

  const calculateRemainingTerm = () => {
    if (!formData.maturity_date) return 0;
    const maturity = new Date(formData.maturity_date);
    const today = new Date();
    const monthsRemaining = Math.max(0, (maturity.getFullYear() - today.getFullYear()) * 12 + (maturity.getMonth() - today.getMonth()));
    return monthsRemaining;
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const token = (await supabase.auth.session()).data.session?.access_token;

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setEditing(false);
        loadPropertyData();
      }
    } catch (error) {
      console.error('Error saving mortgage data:', error);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    loadPropertyData();
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="mortgage-details loading">
        <div className="loading-spinner"></div>
        <p>Loading mortgage information...</p>
      </div>
    );
  }

  const totalMonthlyPayment = calculateTotalPayment();
  const ytdTotalPaid = calculateYTDPaid();
  const remainingMonths = calculateRemainingTerm();

  return (
    <div className="mortgage-details">
      <div className="details-header">
        <div className="header-title">
          <button className="back-btn" onClick={() => onNavigate('overview')}>
            ← Back to Overview
          </button>
          <h2>Mortgage Details</h2>
          <p className="header-subtitle">Loan information and payment breakdown</p>
        </div>
        <div className="header-actions">
          {!editing && (
            <button
              className="btn btn-primary"
              onClick={() => setEditing(true)}
            >
              Edit Mortgage
            </button>
          )}
          {editing && (
            <div className="edit-actions">
              <button
                className="btn btn-outline"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key Summary Cards */}
      <div className="mortgage-summary">
        <div className="summary-card">
          <div className="summary-icon">🏦</div>
          <div className="summary-content">
            <h3>Loan Amount</h3>
            <div className="summary-value">
              {editing ? (
                <input
                  type="number"
                  value={formData.loan_amount}
                  onChange={(e) => setFormData({...formData, loan_amount: e.target.value})}
                  className="summary-input"
                />
              ) : (
                formatCurrency(formData.loan_amount)
              )}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h3>Interest Rate</h3>
            <div className="summary-value">
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
                  className="summary-input"
                />
              ) : (
                `${parseFloat(formData.interest_rate || 0).toFixed(2)}%`
              )}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📅</div>
          <div className="summary-content">
            <h3>Remaining Term</h3>
            <div className="summary-value">
              {remainingMonths > 0 ? `${remainingMonths} months` : 'Paid off'}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Monthly Payment</h3>
            <div className="summary-value primary">
              {formatCurrency(totalMonthlyPayment)}
            </div>
          </div>
        </div>
      </div>

      {/* Lender Information */}
      <div className="section-card">
        <h3>Lender Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Lender Name</label>
            {editing ? (
              <input
                type="text"
                value={formData.lender_name}
                onChange={(e) => setFormData({...formData, lender_name: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formData.lender_name || 'Not specified'}</span>
            )}
          </div>

          <div className="info-item">
            <label>Servicer Name</label>
            {editing ? (
              <input
                type="text"
                value={formData.servicer_name}
                onChange={(e) => setFormData({...formData, servicer_name: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formData.servicer_name || 'Not specified'}</span>
            )}
          </div>

          <div className="info-item">
            <label>Loan Number</label>
            {editing ? (
              <input
                type="text"
                value={formData.loan_number}
                onChange={(e) => setFormData({...formData, loan_number: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formData.loan_number || 'Not specified'}</span>
            )}
          </div>

          <div className="info-item">
            <label>Closing Date</label>
            {editing ? (
              <input
                type="date"
                value={formData.closing_date}
                onChange={(e) => setFormData({...formData, closing_date: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formatDate(formData.closing_date)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Loan Terms */}
      <div className="section-card">
        <h3>Loan Terms</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Original Loan Amount</label>
            {editing ? (
              <input
                type="number"
                value={formData.loan_amount}
                onChange={(e) => setFormData({...formData, loan_amount: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formatCurrency(formData.loan_amount)}</span>
            )}
          </div>

          <div className="info-item">
            <label>Interest Rate</label>
            {editing ? (
              <input
                type="number"
                step="0.01"
                value={formData.interest_rate}
                onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{`${parseFloat(formData.interest_rate || 0).toFixed(2)}%`}</span>
            )}
          </div>

          <div className="info-item">
            <label>Term (Months)</label>
            {editing ? (
              <input
                type="number"
                value={formData.term_months}
                onChange={(e) => setFormData({...formData, term_months: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formData.term_months || 'Not specified'} months</span>
            )}
          </div>

          <div className="info-item">
            <label>Current Balance</label>
            {editing ? (
              <input
                type="number"
                value={formData.current_balance}
                onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formatCurrency(formData.current_balance)}</span>
            )}
          </div>

          <div className="info-item">
            <label>First Payment Date</label>
            {editing ? (
              <input
                type="date"
                value={formData.first_payment_date}
                onChange={(e) => setFormData({...formData, first_payment_date: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formatDate(formData.first_payment_date)}</span>
            )}
          </div>

          <div className="info-item">
            <label>Maturity Date</label>
            {editing ? (
              <input
                type="date"
                value={formData.maturity_date}
                onChange={(e) => setFormData({...formData, maturity_date: e.target.value})}
                className="info-input"
              />
            ) : (
              <span className="info-value">{formatDate(formData.maturity_date)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Payment Breakdown */}
      <div className="section-card">
        <h3>Monthly Payment Breakdown</h3>
        <div className="payment-breakdown">
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">Principal & Interest</span>
              {editing ? (
                <input
                  type="number"
                  value={formData.principal_interest_monthly}
                  onChange={(e) => setFormData({...formData, principal_interest_monthly: e.target.value})}
                  className="breakdown-input"
                />
              ) : (
                <span className="breakdown-value">{formatCurrency(formData.principal_interest_monthly)}</span>
              )}
            </div>
            <div className="breakdown-bar">
              <div
                className="breakdown-fill pi-fill"
                style={{
                  width: `${totalMonthlyPayment > 0 ? (parseFloat(formData.principal_interest_monthly || 0) / totalMonthlyPayment) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">Property Taxes</span>
              {editing ? (
                <input
                  type="number"
                  value={formData.property_taxes_monthly}
                  onChange={(e) => setFormData({...formData, property_taxes_monthly: e.target.value})}
                  className="breakdown-input"
                />
              ) : (
                <span className="breakdown-value">{formatCurrency(formData.property_taxes_monthly)}</span>
              )}
            </div>
            <div className="breakdown-bar">
              <div
                className="breakdown-fill taxes-fill"
                style={{
                  width: `${totalMonthlyPayment > 0 ? (parseFloat(formData.property_taxes_monthly || 0) / totalMonthlyPayment) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">Insurance</span>
              {editing ? (
                <input
                  type="number"
                  value={formData.insurance_monthly}
                  onChange={(e) => setFormData({...formData, insurance_monthly: e.target.value})}
                  className="breakdown-input"
                />
              ) : (
                <span className="breakdown-value">{formatCurrency(formData.insurance_monthly)}</span>
              )}
            </div>
            <div className="breakdown-bar">
              <div
                className="breakdown-fill insurance-fill"
                style={{
                  width: `${totalMonthlyPayment > 0 ? (parseFloat(formData.insurance_monthly || 0) / totalMonthlyPayment) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">HOA</span>
              {editing ? (
                <input
                  type="number"
                  value={formData.hoa_monthly}
                  onChange={(e) => setFormData({...formData, hoa_monthly: e.target.value})}
                  className="breakdown-input"
                />
              ) : (
                <span className="breakdown-value">{formatCurrency(formData.hoa_monthly)}</span>
              )}
            </div>
            <div className="breakdown-bar">
              <div
                className="breakdown-fill hoa-fill"
                style={{
                  width: `${totalMonthlyPayment > 0 ? (parseFloat(formData.hoa_monthly || 0) / totalMonthlyPayment) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">PMI</span>
              {editing ? (
                <input
                  type="number"
                  value={formData.pmi_monthly}
                  onChange={(e) => setFormData({...formData, pmi_monthly: e.target.value})}
                  className="breakdown-input"
                />
              ) : (
                <span className="breakdown-value">{formatCurrency(formData.pmi_monthly)}</span>
              )}
            </div>
            <div className="breakdown-bar">
              <div
                className="breakdown-fill pmi-fill"
                style={{
                  width: `${totalMonthlyPayment > 0 ? (parseFloat(formData.pmi_monthly || 0) / totalMonthlyPayment) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">Other</span>
              {editing ? (
                <input
                  type="number"
                  value={formData.other_monthly}
                  onChange={(e) => setFormData({...formData, other_monthly: e.target.value})}
                  className="breakdown-input"
                />
              ) : (
                <span className="breakdown-value">{formatCurrency(formData.other_monthly)}</span>
              )}
            </div>
            <div className="breakdown-bar">
              <div
                className="breakdown-fill other-fill"
                style={{
                  width: `${totalMonthlyPayment > 0 ? (parseFloat(formData.other_monthly || 0) / totalMonthlyPayment) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        <div className="total-payment">
          <div className="total-header">
            <span className="total-label">Total Monthly Payment</span>
            <span className="total-value">{formatCurrency(totalMonthlyPayment)}</span>
          </div>
        </div>
      </div>

      {/* YTD Summary */}
      <div className="section-card">
        <h3>Year-to-Date Summary</h3>
        <div className="ytd-grid">
          <div className="ytd-item">
            <label>Principal Paid YTD</label>
            {editing ? (
              <input
                type="number"
                value={formData.ytd_principal_paid}
                onChange={(e) => setFormData({...formData, ytd_principal_paid: e.target.value})}
                className="ytd-input"
              />
            ) : (
              <span className="ytd-value">{formatCurrency(formData.ytd_principal_paid)}</span>
            )}
          </div>

          <div className="ytd-item">
            <label>Interest Paid YTD</label>
            {editing ? (
              <input
                type="number"
                value={formData.ytd_interest_paid}
                onChange={(e) => setFormData({...formData, ytd_interest_paid: e.target.value})}
                className="ytd-input"
              />
            ) : (
              <span className="ytd-value">{formatCurrency(formData.ytd_interest_paid)}</span>
            )}
          </div>

          <div className="ytd-item total">
            <label>Total Paid YTD</label>
            <span className="ytd-value">{formatCurrency(ytdTotalPaid)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageDetails;