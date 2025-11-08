import React from 'react';

const EnhancedPropertyCard = ({
  property,
  onEdit,
  onDelete,
  onViewDocuments,
  onViewScorecard,
  onViewHeloc
}) => {
  // Format helpers
  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'N/A';
    return `${numeric.toFixed(2)}%`;
  };

  const formatLocation = () => {
    const city = property.city || '';
    const state = property.state || '';
    const zip = property.zip_code || property.zipCode || '';

    const parts = [];
    if (city && state) {
      parts.push(`${city}, ${state}`);
    } else if (city) {
      parts.push(city);
    } else if (state) {
      parts.push(state);
    }
    if (zip) {
      parts.push(zip);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Location not set';
  };

  // Calculate metrics
  const calculateMonthlyIncome = () => {
    const rent = Number(property.rent) || 0;
    return rent;
  };

  const calculateMonthlyExpenses = () => {
    const taxes = (Number(property.taxes) || 0) / 12;
    const insurance = (Number(property.insurance) || 0) / 12;
    const hoa = Number(property.hoa) || 0;
    const maintenance = (Number(property.maintenance) || 0) / 100 * (Number(property.rent) || 0);

    return taxes + insurance + hoa + maintenance;
  };

  const calculateNetCashFlow = () => {
    const income = calculateMonthlyIncome();
    const expenses = calculateMonthlyExpenses();
    const mortgage = Number(property.monthly_payment) || 0;

    return income - expenses - mortgage;
  };

  const calculateROI = () => {
    const downPayment = Number(property.down_payment) || 0;
    if (downPayment === 0) return null;

    const annualCashFlow = calculateNetCashFlow() * 12;
    return (annualCashFlow / downPayment) * 100;
  };

  const cashFlow = calculateNetCashFlow();
  const roi = calculateROI();

  // Get performance color
  const getPerformanceColor = (value) => {
    if (value > 0) return '#10B981'; // Green
    if (value < 0) return '#EF4444'; // Red
    return '#94a3b8'; // Gray
  };

  const getROIColor = (value) => {
    if (value >= 10) return '#10B981'; // Excellent
    if (value >= 5) return '#F59E0B'; // Good
    if (value > 0) return '#94a3b8'; // Fair
    return '#EF4444'; // Poor
  };

  // Get performance badge
  const getPerformanceBadge = () => {
    if (roi === null || cashFlow === null) {
      return { label: 'Pending', color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)' };
    }

    const score = (roi >= 10 ? 2 : roi >= 5 ? 1 : 0) + (cashFlow > 0 ? 1 : 0);

    if (score >= 3) return { label: 'Excellent', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' };
    if (score === 2) return { label: 'Good', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' };
    if (score === 1) return { label: 'Fair', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' };
    return { label: 'Needs Attention', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
  };

  // Calculate occupancy percentage (inverse of vacancy)
  const getOccupancyRate = () => {
    const vacancy = Number(property.vacancy) || 0;
    return Math.max(0, Math.min(100, 100 - vacancy));
  };

  // Get LTV percentage
  const getLTVPercentage = () => {
    const ltv = Number(property.ltv) || 0;
    return Math.max(0, Math.min(100, ltv));
  };

  const performanceBadge = getPerformanceBadge();
  const occupancyRate = getOccupancyRate();
  const ltvPercentage = getLTVPercentage();

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--panel-primary) 0%, rgba(79, 70, 229, 0.03) 100%)',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      '&:hover': {
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.1)'
      }
    }}>
      {/* Header Section */}
      <div style={{
        background: '#1e293b',
        padding: '20px',
        borderBottom: '3px solid #4F46E5'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '6px',
              lineHeight: '1.3',
              color: '#f1f5f9'
            }}>
              {property.address || 'Property Address'}
            </h3>
            <div style={{
              fontSize: '13px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '14px' }}>📍</span>
              {formatLocation()}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{
              padding: '6px 14px',
              background: '#4F46E5',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'white'
            }}>
              {property.property_type || 'Residential'}
            </div>
            <div style={{
              padding: '4px 10px',
              background: performanceBadge.bgColor,
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              color: performanceBadge.color,
              border: `1px solid ${performanceBadge.color}`,
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              {performanceBadge.label}
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics Section */}
      <div style={{ padding: '20px' }}>
        {/* Primary Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(96, 165, 250, 0.2)'
          }}>
            <div style={{ fontSize: '12px', color: '#60A5FA', fontWeight: 600, marginBottom: '4px' }}>
              PROPERTY VALUE
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#60A5FA' }}>
              {formatCurrency(property.valuation)}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, marginBottom: '4px' }}>
              MONTHLY RENT
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981' }}>
              {formatCurrency(property.rent)}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{
          padding: '16px',
          background: 'var(--panel-secondary)',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            📊 Performance Metrics
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{
              padding: '12px',
              background: cashFlow > 0 ? 'rgba(16, 185, 129, 0.05)' : cashFlow < 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(148, 163, 184, 0.05)',
              borderRadius: '8px',
              border: `1px solid ${cashFlow > 0 ? 'rgba(16, 185, 129, 0.2)' : cashFlow < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)'}`
            }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>{cashFlow > 0 ? '📈' : cashFlow < 0 ? '📉' : '➖'}</span>
                <span>Cash Flow (Monthly)</span>
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: getPerformanceColor(cashFlow)
              }}>
                {formatCurrency(cashFlow)}
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: roi !== null && roi >= 10 ? 'rgba(16, 185, 129, 0.05)' : roi !== null && roi >= 5 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(148, 163, 184, 0.05)',
              borderRadius: '8px',
              border: `1px solid ${roi !== null && roi >= 10 ? 'rgba(16, 185, 129, 0.2)' : roi !== null && roi >= 5 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)'}`
            }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>{roi !== null && roi >= 10 ? '⭐' : roi !== null && roi >= 5 ? '✓' : '○'}</span>
                <span>Cash-on-Cash ROI</span>
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: roi !== null ? getROIColor(roi) : 'var(--text-muted)'
              }}>
                {roi !== null ? `${roi.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Metrics with Progress Bars */}
        <div style={{
          padding: '16px',
          background: 'var(--panel-secondary)',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
            📈 Investment Metrics
          </div>

          {/* LTV Progress Bar */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Loan-to-Value (LTV)</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6' }}>{formatPercentage(property.ltv)}</span>
            </div>
            <ProgressBar
              percentage={ltvPercentage}
              color="#8B5CF6"
              height="8px"
            />
          </div>

          {/* Occupancy Progress Bar */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Occupancy Rate</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>{occupancyRate.toFixed(0)}%</span>
            </div>
            <ProgressBar
              percentage={occupancyRate}
              color="#10B981"
              height="8px"
            />
          </div>

          {/* Interest Rate Display */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Interest Rate</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1' }}>{formatPercentage(property.loan_rate)}</span>
            </div>
          </div>
        </div>

        {/* Loan Information */}
        {property.loan_amount && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(99, 102, 241, 0.05)',
            borderRadius: '10px',
            borderLeft: '3px solid #6366F1',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Loan Amount
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#6366F1' }}>
                  {formatCurrency(property.loan_amount)}
                </div>
              </div>
              {property.loan_term && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Term
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {property.loan_term} yrs
                  </div>
                </div>
              )}
              {property.monthly_payment && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Payment
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(property.monthly_payment)}/mo
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🏠 Mortgage button clicked!', property);
              onViewScorecard(property);
            }}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#334155',
              color: '#e2e8f0',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#475569';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#334155';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '18px' }}>🏠</span>
            <span>Mortgage</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDocuments(property);
            }}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#334155',
              color: '#e2e8f0',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#475569';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#334155';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '18px' }}>📄</span>
            <span>Docs</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('💰 HELOC button clicked!', property);
              onViewHeloc(property);
            }}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              border: '1px solid #065f46',
              background: '#047857',
              color: '#d1fae5',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#059669';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#047857';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '18px' }}>💰</span>
            <span>HELOC</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(property);
            }}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#334155',
              color: '#e2e8f0',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#475569';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#334155';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '18px' }}>✏️</span>
            <span>Edit</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(property.property_id);
            }}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              border: '1px solid #7f1d1d',
              background: '#991b1b',
              color: '#fecaca',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#b91c1c';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#991b1b';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '18px' }}>🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ percentage, color, height = '8px' }) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div style={{
      width: '100%',
      height: height,
      background: 'rgba(100, 116, 139, 0.2)',
      borderRadius: '999px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        width: `${clampedPercentage}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
        borderRadius: '999px',
        transition: 'width 0.5s ease-in-out',
        boxShadow: `0 0 8px ${color}40`
      }} />
    </div>
  );
};

export default EnhancedPropertyCard;
