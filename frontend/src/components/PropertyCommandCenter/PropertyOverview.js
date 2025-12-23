import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PropertyCommandCenter.css';

const PropertyOverview = ({ propertyId, onNavigate }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

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
          purchase_or_refinance_price: propertyData.purchase_price || propertyData.refinance_price || '',
          current_market_value_estimate: propertyData.current_market_value_estimate || '',
          loan_balance: propertyData.loan_balance || propertyData.current_balance || ''
        });
      }
    } catch (error) {
      console.error('Error loading property data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    if (!formData.purchase_or_refinance_price || !formData.current_market_value_estimate || !formData.loan_balance) {
      return {
        appreciationAmount: 0,
        appreciationPercent: 0,
        equityAmount: 0,
        equityPercent: 0,
        ltvRatio: 0
      };
    }

    const purchasePrice = parseFloat(formData.purchase_or_refinance_price) || 0;
    const currentValue = parseFloat(formData.current_market_value_estimate) || 0;
    const loanBalance = parseFloat(formData.loan_balance) || 0;

    const appreciationAmount = currentValue - purchasePrice;
    const appreciationPercent = purchasePrice > 0 ? (appreciationAmount / purchasePrice) * 100 : 0;
    const equityAmount = currentValue - loanBalance;
    const equityPercent = currentValue > 0 ? (equityAmount / currentValue) * 100 : 0;
    const ltvRatio = currentValue > 0 ? (loanBalance / currentValue) * 100 : 0;

    return {
      appreciationAmount,
      appreciationPercent,
      equityAmount,
      equityPercent,
      ltvRatio
    };
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
        body: JSON.stringify({
          ...formData,
          purchase_price: formData.purchase_or_refinance_price,
          current_balance: formData.loan_balance
        })
      });

      if (response.ok) {
        setEditing(false);
        loadPropertyData();
      }
    } catch (error) {
      console.error('Error saving property data:', error);
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

  const formatPercent = (value) => {
    if (!value || isNaN(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="property-overview loading">
        <div className="loading-spinner"></div>
        <p>Loading property data...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="property-overview error">
        <p>Property not found</p>
      </div>
    );
  }

  return (
    <div className="property-overview">
      <div className="overview-header">
        <div className="property-title">
          <h2>{property.address || 'Property Overview'}</h2>
          <p className="property-address">
            {property.city}, {property.state} {property.zip_code}
          </p>
        </div>
        <div className="overview-actions">
          {!editing && (
            <button
              className="btn btn-primary"
              onClick={() => setEditing(true)}
            >
              Edit Values
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
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card market-value">
          <div className="metric-icon">🏠</div>
          <div className="metric-content">
            <h3>Current Market Value</h3>
            <div className="metric-value">
              {editing ? (
                <input
                  type="number"
                  value={formData.current_market_value_estimate}
                  onChange={(e) => setFormData({ ...formData, current_market_value_estimate: e.target.value })}
                  className="metric-input"
                  placeholder="Enter value"
                />
              ) : (
                formatCurrency(formData.current_market_value_estimate)
              )}
            </div>
          </div>
        </div>

        <div className="metric-card appreciation">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>Appreciation</h3>
            <div className="metric-value">
              <div className="primary-value">{formatCurrency(metrics.appreciationAmount)}</div>
              <div className="secondary-value">{formatPercent(metrics.appreciationPercent)}</div>
            </div>
          </div>
        </div>

        <div className="metric-card equity">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>Equity</h3>
            <div className="metric-value">
              <div className="primary-value">{formatCurrency(metrics.equityAmount)}</div>
              <div className="secondary-value">{formatPercent(metrics.equityPercent)}</div>
            </div>
          </div>
        </div>

        <div className="metric-card ltv">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>LTV Ratio</h3>
            <div className="metric-value">
              <div className={`ltv-indicator ${metrics.ltvRatio > 80 ? 'high' : metrics.ltvRatio > 70 ? 'medium' : 'good'}`}>
                {formatPercent(metrics.ltvRatio)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="financial-details">
        <h3>Financial Details</h3>

        <div className="financial-grid">
          <div className="financial-item">
            <label>Purchase/Refinance Price</label>
            {editing ? (
              <input
                type="number"
                value={formData.purchase_or_refinance_price}
                onChange={(e) => setFormData({ ...formData, purchase_or_refinance_price: e.target.value })}
                className="financial-input"
              />
            ) : (
              <span className="financial-value">{formatCurrency(formData.purchase_or_refinance_price)}</span>
            )}
          </div>

          <div className="financial-item">
            <label>Current Loan Balance</label>
            {editing ? (
              <input
                type="number"
                value={formData.loan_balance}
                onChange={(e) => setFormData({ ...formData, loan_balance: e.target.value })}
                className="financial-input"
              />
            ) : (
              <span className="financial-value">{formatCurrency(formData.loan_balance)}</span>
            )}
          </div>

          <div className="financial-item">
            <label>Property Type</label>
            <span className="financial-value">{property.property_type || 'Single Family'}</span>
          </div>

          <div className="financial-item">
            <label>Square Footage</label>
            <span className="financial-value">
              {property.property_sqf ? `${property.property_sqf.toLocaleString()} sq ft` : 'Not specified'}
            </span>
          </div>

          <div className="financial-item">
            <label>Year Built</label>
            <span className="financial-value">
              {property.construction_year || 'Not specified'}
            </span>
          </div>

          <div className="financial-item">
            <label>Monthly Payment</label>
            <span className="financial-value">
              {formatCurrency(property.monthly_payment || property.total_monthly_payment_piti)}
            </span>
          </div>

          <div className="financial-item">
            <label>Interest Rate</label>
            <span className="financial-value">
              {property.interest_rate || property.loan_rate ? `${(property.interest_rate || property.loan_rate).toFixed(2)}%` : 'Not specified'}
            </span>
          </div>

          <div className="financial-item">
            <label>Monthly Rent</label>
            <span className="financial-value">
              {formatCurrency(property.rent || property.gross_monthly_income_rent)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button
            className="action-card"
            onClick={() => onNavigate('mortgage-details')}
          >
            <div className="action-icon">🏦</div>
            <h4>Mortgage Details</h4>
            <p>View loan information and payment history</p>
          </button>

          <button
            className="action-card"
            onClick={() => onNavigate('taxes')}
          >
            <div className="action-icon">🧾</div>
            <h4>Tax Information</h4>
            <p>Property tax details and assessment info</p>
          </button>

          <button
            className="action-card"
            onClick={() => onNavigate('insurance')}
          >
            <div className="action-icon">🛡️</div>
            <h4>Insurance</h4>
            <p>Policy details and coverage information</p>
          </button>

          <button
            className="action-card"
            onClick={() => onNavigate('utilities')}
          >
            <div className="action-icon">💡</div>
            <h4>Utilities</h4>
            <p>Utility accounts and service providers</p>
          </button>

          <button
            className="action-card"
            onClick={() => onNavigate('appliances')}
          >
            <div className="action-icon">🔧</div>
            <h4>Appliances</h4>
            <p>Manage appliance inventory and warranties</p>
          </button>

          <button
            className="action-card"
            onClick={() => onNavigate('documents')}
          >
            <div className="action-icon">📄</div>
            <h4>Documents</h4>
            <p>Upload and manage property documents</p>
          </button>
        </div>
      </div>

      {/* Visualizations */}
      <div className="visualizations">
        <h3>Property Performance</h3>

        <div className="chart-grid">
          <div className="chart-card">
            <h4>Equity Breakdown</h4>
            <div className="equity-chart">
              <div className="equity-bar">
                <div
                  className="equity-loan"
                  style={{ width: `${metrics.ltvRatio}%` }}
                />
                <div
                  className="equity-owned"
                  style={{ width: `${metrics.equityPercent}%` }}
                />
              </div>
              <div className="equity-legend">
                <div className="legend-item">
                  <div className="legend-color loan-color"></div>
                  <span>Loan ({formatPercent(metrics.ltvRatio)})</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color equity-color"></div>
                  <span>Equity ({formatPercent(metrics.equityPercent)})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h4>Key Ratios</h4>
            <div className="ratios-list">
              <div className="ratio-item">
                <span className="ratio-label">LTV Ratio</span>
                <span className={`ratio-value ${metrics.ltvRatio > 80 ? 'high' : metrics.ltvRatio > 70 ? 'medium' : 'good'}`}>
                  {formatPercent(metrics.ltvRatio)}
                </span>
              </div>
              <div className="ratio-item">
                <span className="ratio-label">Equity %</span>
                <span className="ratio-value">{formatPercent(metrics.equityPercent)}</span>
              </div>
              <div className="ratio-item">
                <span className="ratio-label">Appreciation</span>
                <span className={`ratio-value ${metrics.appreciationPercent < 0 ? 'negative' : 'positive'}`}>
                  {formatPercent(metrics.appreciationPercent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyOverview;