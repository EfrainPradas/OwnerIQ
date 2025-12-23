import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './InvestorPortfolio.css';

const PortfolioDashboard = ({ onNavigate }) => {
  const [properties, setProperties] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    totalProperties: 0,
    totalMarketValue: 0,
    totalEquity: 0,
    totalAppreciation: 0,
    avgAppreciationPercent: 0,
    totalLoanBalance: 0,
    portfolioLTV: 0
  });

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const token = (await supabase.auth.session()).data.session?.access_token;

      // Load properties
      const propertiesResponse = await fetch(`/api/properties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Load entities
      const entitiesResponse = await fetch(`/api/onboarding/entities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json();
        setProperties(propertiesData || []);
        calculatePortfolioMetrics(propertiesData || []);
      }

      if (entitiesResponse.ok) {
        const entitiesData = await entitiesResponse.json();
        setEntities(entitiesData || []);
      }
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolioMetrics = (propertyList) => {
    let totalMarketValue = 0;
    let totalEquity = 0;
    let totalAppreciation = 0;
    let totalLoanBalance = 0;
    let validAppreciationCount = 0;
    let appreciationSum = 0;

    propertyList.forEach(property => {
      const marketValue = parseFloat(property.current_market_value_estimate) || parseFloat(property.valuation) || 0;
      const purchasePrice = parseFloat(property.purchase_price) || parseFloat(property.refinance_price) || 0;
      const loanBalance = parseFloat(property.current_balance) || parseFloat(property.loan_balance) || 0;

      totalMarketValue += marketValue;
      totalLoanBalance += loanBalance;

      const equity = marketValue - loanBalance;
      totalEquity += equity;

      if (purchasePrice > 0) {
        const appreciation = marketValue - purchasePrice;
        totalAppreciation += appreciation;
        const appreciationPercent = (appreciation / purchasePrice) * 100;
        appreciationSum += appreciationPercent;
        validAppreciationCount++;
      }
    });

    const avgAppreciationPercent = validAppreciationCount > 0 ? appreciationSum / validAppreciationCount : 0;
    const portfolioLTV = totalMarketValue > 0 ? (totalLoanBalance / totalMarketValue) * 100 : 0;

    setPortfolioMetrics({
      totalProperties: propertyList.length,
      totalMarketValue,
      totalEquity,
      totalAppreciation,
      avgAppreciationPercent,
      totalLoanBalance,
      portfolioLTV
    });
  };

  const getPropertiesByEntity = () => {
    const entityGroups = {};

    properties.forEach(property => {
      const entityId = property.entity_id || 'personal';
      const entityName = entityId === 'personal' ? 'Personal Ownership' :
                       entities.find(e => e.entity_id === entityId)?.entity_name || 'Unknown Entity';

      if (!entityGroups[entityId]) {
        entityGroups[entityId] = {
          id: entityId,
          name: entityName,
          properties: [],
          totalValue: 0,
          totalEquity: 0,
          propertyCount: 0
        };
      }

      const marketValue = parseFloat(property.current_market_value_estimate) || parseFloat(property.valuation) || 0;
      const loanBalance = parseFloat(property.current_balance) || parseFloat(property.loan_balance) || 0;
      const equity = marketValue - loanBalance;

      entityGroups[entityId].properties.push(property);
      entityGroups[entityId].totalValue += marketValue;
      entityGroups[entityId].totalEquity += equity;
      entityGroups[entityId].propertyCount++;
    });

    return Object.values(entityGroups);
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

  if (loading) {
    return (
      <div className="portfolio-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading portfolio data...</p>
      </div>
    );
  }

  const propertiesByEntity = getPropertiesByEntity();

  return (
    <div className="portfolio-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>Investor Portfolio</h2>
          <p className="header-subtitle">Cross-property analytics and performance</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('ownership')}>
            Manage Entities
          </button>
        </div>
      </div>

      {/* Portfolio Overview KPIs */}
      <div className="portfolio-overview">
        <div className="kpi-grid">
          <div className="kpi-card primary">
            <div className="kpi-icon">🏢</div>
            <div className="kpi-content">
              <h3>Total Properties</h3>
              <div className="kpi-value">{portfolioMetrics.totalProperties}</div>
              <div className="kpi-subtitle">Active investments</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">💰</div>
            <div className="kpi-content">
              <h3>Total Market Value</h3>
              <div className="kpi-value">{formatCurrency(portfolioMetrics.totalMarketValue)}</div>
              <div className="kpi-subtitle">Combined property values</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">📈</div>
            <div className="kpi-content">
              <h3>Total Equity</h3>
              <div className="kpi-value">{formatCurrency(portfolioMetrics.totalEquity)}</div>
              <div className="kpi-subtitle">Net worth in properties</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">📊</div>
            <div className="kpi-content">
              <h3>Total Appreciation</h3>
              <div className="kpi-value">{formatCurrency(portfolioMetrics.totalAppreciation)}</div>
              <div className="kpi-subtitle">Avg: {formatPercent(portfolioMetrics.avgAppreciationPercent)}</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">🏦</div>
            <div className="kpi-content">
              <h3>Total Loan Balance</h3>
              <div className="kpi-value">{formatCurrency(portfolioMetrics.totalLoanBalance)}</div>
              <div className="kpi-subtitle">Outstanding mortgages</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon">📉</div>
            <div className="kpi-content">
              <h3>Portfolio LTV</h3>
              <div className={`kpi-value ${portfolioMetrics.portfolioLTV > 80 ? 'high' : portfolioMetrics.portfolioLTV > 70 ? 'medium' : 'good'}`}>
                {formatPercent(portfolioMetrics.portfolioLTV)}
              </div>
              <div className="kpi-subtitle">Loan-to-value ratio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ownership Structure */}
      <div className="ownership-section">
        <div className="section-header">
          <h3>Ownership Structure</h3>
          <button className="btn btn-outline" onClick={() => onNavigate('ownership')}>
            View All Entities
          </button>
        </div>

        <div className="entity-grid">
          {propertiesByEntity.map(entity => (
            <div key={entity.id} className="entity-card">
              <div className="entity-header">
                <h4>{entity.name}</h4>
                <span className="property-count">{entity.propertyCount} properties</span>
              </div>

              <div className="entity-metrics">
                <div className="metric-row">
                  <span className="metric-label">Total Value</span>
                  <span className="metric-value">{formatCurrency(entity.totalValue)}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Total Equity</span>
                  <span className="metric-value">{formatCurrency(entity.totalEquity)}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Equity %</span>
                  <span className="metric-value">
                    {entity.totalValue > 0 ? formatPercent((entity.totalEquity / entity.totalValue) * 100) : '0%'}
                  </span>
                </div>
              </div>

              <button className="view-properties-btn" onClick={() => onNavigate('entity-details', entity.id)}>
                View Properties →
              </button>
            </div>
          ))}

          {entities.length === 0 && propertiesByEntity.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h4>No Properties Yet</h4>
              <p>Start by adding your first property to build your portfolio</p>
              <button className="btn btn-primary" onClick={() => onNavigate('onboarding')}>
                Add First Property
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Charts */}
      <div className="portfolio-charts">
        <div className="chart-row">
          <div className="chart-card">
            <h3>Market Value by Entity</h3>
            <div className="donut-chart-container">
              <div className="donut-chart">
                {propertiesByEntity.map((entity, index) => {
                  const percentage = portfolioMetrics.totalMarketValue > 0
                    ? (entity.totalValue / portfolioMetrics.totalMarketValue) * 100
                    : 0;
                  const colors = ['#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6'];

                  return (
                    <div key={entity.id} className="chart-segment">
                      <div
                        className="segment-visual"
                        style={{
                          background: colors[index % colors.length],
                          width: `${percentage}%`
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="chart-legend">
                {propertiesByEntity.map((entity, index) => {
                  const colors = ['#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6'];
                  const percentage = portfolioMetrics.totalMarketValue > 0
                    ? (entity.totalValue / portfolioMetrics.totalMarketValue) * 100
                    : 0;

                  return (
                    <div key={entity.id} className="legend-item">
                      <div
                        className="legend-color"
                        style={{ background: colors[index % colors.length] }}
                      />
                      <span className="legend-label">{entity.name}</span>
                      <span className="legend-value">{formatPercent(percentage)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>Performance Overview</h3>
            <div className="performance-metrics">
              <div className="performance-item">
                <span className="performance-label">Average Appreciation</span>
                <span className={`performance-value ${portfolioMetrics.avgAppreciationPercent >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(portfolioMetrics.avgAppreciationPercent)}
                </span>
              </div>

              <div className="performance-item">
                <span className="performance-label">Portfolio LTV</span>
                <span className={`performance-value ${portfolioMetrics.portfolioLTV > 80 ? 'high' : portfolioMetrics.portfolioLTV > 70 ? 'medium' : 'good'}`}>
                  {formatPercent(portfolioMetrics.portfolioLTV)}
                </span>
              </div>

              <div className="performance-item">
                <span className="performance-label">Total Equity</span>
                <span className="performance-value positive">
                  {formatCurrency(portfolioMetrics.totalEquity)}
                </span>
              </div>

              <div className="performance-item">
                <span className="performance-label">Cash-on-Cash Avg</span>
                <span className="performance-value">12.5%</span>
              </div>

              <div className="performance-item">
                <span className="performance-label">Cap Rate Avg</span>
                <span className="performance-value">8.3%</span>
              </div>

              <div className="performance-item">
                <span className="performance-label">DSCR Avg</span>
                <span className="performance-value good">1.35</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="properties-table-section">
        <div className="section-header">
          <h3>All Properties</h3>
          <button className="btn btn-outline" onClick={() => onNavigate('properties')}>
            Manage Properties
          </button>
        </div>

        <div className="properties-table-container">
          <table className="properties-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Market Value</th>
                <th>Loan Balance</th>
                <th>Equity</th>
                <th>Equity %</th>
                <th>Appreciation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map(property => {
                const marketValue = parseFloat(property.current_market_value_estimate) || parseFloat(property.valuation) || 0;
                const loanBalance = parseFloat(property.current_balance) || parseFloat(property.loan_balance) || 0;
                const purchasePrice = parseFloat(property.purchase_price) || parseFloat(property.refinance_price) || 0;
                const equity = marketValue - loanBalance;
                const equityPercent = marketValue > 0 ? (equity / marketValue) * 100 : 0;
                const appreciation = marketValue - purchasePrice;
                const appreciationPercent = purchasePrice > 0 ? (appreciation / purchasePrice) * 100 : 0;

                const entityId = property.entity_id || 'personal';
                const entityName = entityId === 'personal' ? 'Personal' :
                                 entities.find(e => e.entity_id === entityId)?.entity_name || 'Unknown';

                return (
                  <tr key={property.property_id}>
                    <td>
                      <div className="property-info">
                        <div className="property-address">{property.address}</div>
                        <div className="property-location">
                          {property.city}, {property.state}
                        </div>
                        <div className="property-entity">{entityName}</div>
                      </div>
                    </td>
                    <td>
                      <span className="property-type">
                        {property.property_type || 'Single Family'}
                      </span>
                    </td>
                    <td>{formatCurrency(marketValue)}</td>
                    <td>{formatCurrency(loanBalance)}</td>
                    <td className={equity >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(equity)}
                    </td>
                    <td>
                      <span className={`equity-percent ${equityPercent < 20 ? 'low' : equityPercent < 40 ? 'medium' : 'good'}`}>
                        {formatPercent(equityPercent)}
                      </span>
                    </td>
                    <td className={appreciationPercent >= 0 ? 'positive' : 'negative'}>
                      <div>{formatCurrency(appreciation)}</div>
                      <small>{formatPercent(appreciationPercent)}</small>
                    </td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => onNavigate('property-details', property.property_id)}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {properties.length === 0 && (
            <div className="table-empty-state">
              <p>No properties in your portfolio yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioDashboard;