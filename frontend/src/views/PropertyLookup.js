import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../config';

function PropertyLookup({ embedded = false, onDataImport }) {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Calculate financial metrics
  const calculateMetrics = (data) => {
    if (!data) return null;
    
    const price = data.price || 0;
    const propertyTaxRate = data.propertyTaxRate || 0;
    const annualHomeownersInsurance = data.annualHomeownersInsurance || 0;
    
    // Calculate annual property tax
    const annualPropertyTax = price * (propertyTaxRate / 100);
    
    // Calculate annual fixed costs (property tax + insurance)
    const annualFixedCosts = annualPropertyTax + annualHomeownersInsurance;
    
    // Calculate monthly fixed cost
    const monthlyFixedCost = annualFixedCosts / 12;
    
    // Estimate mortgage (assuming 20% down, 7% interest, 30 years)
    const loanAmount = price * 0.8;
    const monthlyRate = 0.07 / 12;
    const numPayments = 30 * 12;
    const estimatedMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    // Total monthly cost
    const totalMonthlyCost = estimatedMortgage + monthlyFixedCost;
    
    // Estimate monthly rent (1% of property value)
    const estimatedMonthlyRent = price * 0.01;
    
    // Calculate ROI (annual)
    const annualRent = estimatedMonthlyRent * 12;
    const annualCosts = (totalMonthlyCost * 12);
    const annualCashFlow = annualRent - annualCosts;
    const downPayment = price * 0.2;
    const roi = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
    
    // Calculate Cap Rate
    const noi = annualRent - annualFixedCosts;
    const capRate = price > 0 ? (noi / price) * 100 : 0;
    
    return {
      annualPropertyTax: Math.round(annualPropertyTax * 100) / 100,
      annualFixedCosts: Math.round(annualFixedCosts * 100) / 100,
      monthlyFixedCost: Math.round(monthlyFixedCost * 100) / 100,
      estimatedMortgage: Math.round(estimatedMortgage),
      totalMonthlyCost: Math.round(totalMonthlyCost),
      roi: Math.round(roi * 100) / 100,
      capRate: Math.round(capRate * 100) / 100,
      estimatedMonthlyRent: Math.round(estimatedMonthlyRent)
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!address.trim()) {
      setError('Please enter an address to search.');
      return;
    }

    setIsLoading(true);

    try {
      const session = await supabase.auth.session();
      const accessToken = session?.access_token;

      if (!accessToken && !ENABLE_DEMO_MODE) {
        setError('Your session has expired. Please log in again to perform the search.');
        setIsLoading(false);
        return;
      }

      const token = accessToken || 'dummy-token';
      const baseUrl = (API_BASE_URL || '').trim().replace(/\/$/, '');
      const encodedAddress = encodeURIComponent(address);
      const endpoint = baseUrl
        ? `${baseUrl}/api/external/property-details?address=${encodedAddress}`
        : `/api/external/property-details?address=${encodedAddress}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || `Error ${response.status}`);
      }

      setResult(payload);
      
      // Call onDataImport callback if provided
      if (onDataImport && typeof onDataImport === 'function') {
        onDataImport(payload);
      }
    } catch (err) {
      console.error('Error fetching property details:', err);
      setError(err.message || 'Unable to fetch property information.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerProps = embedded
    ? { style: { width: '100%', maxWidth: '100%' } }
    : { className: 'container', style: { maxWidth: '900px' } };

  return (
    <div {...containerProps}>
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '16px' }}>Property Lookup </h1>
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          Enter the complete address (street, city, state, zip code) to search for real-time property data.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="5377 N Blacksmith Rd, Eagle Mountain, UT 84005"
            style={{
              flex: 1,
              minWidth: '260px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--panel-secondary)',
              color: 'var(--text-primary)'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ padding: '12px 20px' }}
          >
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.35)',
            color: 'var(--error)'
          }}>
            {error}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '32px', color: 'var(--accent-primary)' }}></i>
          <p style={{ marginTop: '12px' }}>Querying RapidAPI…</p>
        </div>
      )}

      {result && result.data && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fas fa-home" style={{ color: 'var(--accent-primary)' }}></i>
            Property Details
          </h2>

          {/* Dirección Principal */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
              {result.data.streetAddress || 'N/A'}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
              {result.data.city}, {result.data.state} {result.data.zipcode}
            </p>
            {result.data.county && (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                County: {result.data.county}
              </p>
            )}
          </div>

          {/* Property Images Section */}
          {(result.data.hiResImageLink || result.data.mediumImageLink) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                <i className="fas fa-images" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
                Property Images
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {result.data.hiResImageLink && (
                  <div style={{
                    padding: '12px',
                    background: 'var(--panel-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                      <i className="fas fa-map" style={{ marginRight: '6px', color: 'var(--accent-primary)' }}></i>
                      High Resolution (Static Map)
                    </div>
                    <a
                      href={result.data.hiResImageLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', marginBottom: '8px' }}
                    >
                      <img
                        src={result.data.hiResImageLink}
                        alt="High resolution property view"
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    </a>
                    <a
                      href={result.data.hiResImageLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-external-link-alt"></i>
                      View Full Image
                    </a>
                  </div>
                )}

                {result.data.mediumImageLink && (
                  <div style={{
                    padding: '12px',
                    background: 'var(--panel-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                      <i className="fas fa-satellite" style={{ marginRight: '6px', color: 'var(--accent-primary)' }}></i>
                      Satellite View
                    </div>
                    <a
                      href={result.data.mediumImageLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', marginBottom: '8px' }}
                    >
                      <img
                        src={result.data.mediumImageLink}
                        alt="Satellite property view"
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    </a>
                    <a
                      href={result.data.mediumImageLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <i className="fas fa-external-link-alt"></i>
                      View Full Image
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Información Básica */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Price</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                ${result.data.price?.toLocaleString() || 'N/A'}
              </div>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Bedrooms</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                <i className="fas fa-bed" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
                {result.data.bedrooms || 'N/A'}
              </div>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Bathrooms</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                <i className="fas fa-bath" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
                {result.data.bathrooms || 'N/A'}
              </div>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Year Built</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                <i className="fas fa-calendar" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
                {result.data.yearBuilt || 'N/A'}
              </div>
            </div>
          </div>

          {/* Property Details Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Property Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Property Type:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  {result.data.homeType?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </div>
              
              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  {result.data.homeStatus?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </div>
              
              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Zestimate:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  ${result.data.zestimate?.toLocaleString() || 'N/A'}
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Living Area:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  {result.data.livingArea?.toLocaleString() || 'N/A'} sq ft
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lot Size:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  {result.data.lotAreaValue?.toLocaleString() || 'N/A'} {result.data.lotAreaUnits || 'sq ft'}
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Property Tax Rate:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  {result.data.propertyTaxRate || 'N/A'}%
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Annual Insurance:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  ${result.data.annualHomeownersInsurance?.toLocaleString() || 'N/A'}
                </span>
              </div>
              
              <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>ZPID:</span>
                <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                  {result.data.zpid || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Analysis Section */}
          {(() => {
            const metrics = calculateMetrics(result.data);
            if (!metrics) return null;
            
            return (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                  <i className="fas fa-chart-line" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
                  Financial Analysis
                </h3>
                
                {/* Key Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px', border: '2px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Cap Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                      {metrics.capRate}%
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px', border: '2px solid var(--success)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>ROI (Annual)</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
                      {metrics.roi}%
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Est. Monthly Rent</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
                      ${metrics.estimatedMonthlyRent?.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Est. Mortgage</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)' }}>
                      ${metrics.estimatedMortgage?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Detailed Costs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Annual Property Tax:</span>
                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                      ${metrics.annualPropertyTax?.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Annual Fixed Costs:</span>
                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                      ${metrics.annualFixedCosts?.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Monthly Fixed Cost:</span>
                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                      ${metrics.monthlyFixedCost?.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--panel-secondary)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Monthly Cost:</span>
                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                      ${metrics.totalMonthlyCost?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(108, 138, 255, 0.1)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                  Calculations assume: 20% down payment, 7% interest rate, 30-year mortgage, 1% monthly rent estimate
                </div>
              </div>
            );
          })()}

          {/* Ciudades Cercanas */}
          {result.data.nearbyCities && result.data.nearbyCities.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
                Nearby Cities
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.data.nearbyCities.map((city, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--panel-secondary)',
                      borderRadius: '16px',
                      fontSize: '14px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {city.regionUrl?.name || city.name || 'N/A'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Códigos Postales Cercanos */}
          {result.data.nearbyZipcodes && result.data.nearbyZipcodes.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                <i className="fas fa-mail-bulk" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
                Nearby Zip Codes
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.data.nearbyZipcodes.map((zip, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--panel-secondary)',
                      borderRadius: '16px',
                      fontSize: '14px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {zip.regionUrl?.name || zip.name || 'N/A'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Datos Raw (Colapsable) */}
          <details style={{ marginTop: '24px' }}>
            <summary style={{
              cursor: 'pointer',
              padding: '12px',
              background: 'var(--panel-secondary)',
              borderRadius: '8px',
              fontWeight: '600',
              userSelect: 'none'
            }}>
              <i className="fas fa-code" style={{ marginRight: '8px' }}></i>
              View Complete Data (JSON)
            </summary>
            <pre style={{
              background: 'var(--panel-secondary)',
              borderRadius: '8px',
              padding: '16px',
              overflowX: 'auto',
              maxHeight: '400px',
              marginTop: '12px',
              fontSize: '12px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default PropertyLookup;
