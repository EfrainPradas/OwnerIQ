import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../../config';

function BorrowersView({ borrowers, setBorrowers, isLoading, searchTerm }) {
  const [showForm, setShowForm] = useState(false);
  const [borrowerForm, setBorrowerForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleBorrowerSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken && !ENABLE_DEMO_MODE) {
        setErrorMessage('Authentication required. Please sign in again.');
        return;
      }

      const token = accessToken || 'dummy-token';
      const baseUrl = API_BASE_URL || '';

      const response = await fetch(`${baseUrl}/api/borrowers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(borrowerForm)
      });
      
      if (response.ok) {
        setSuccessMessage('Borrower added successfully!');
        setBorrowerForm({});
        // Refresh borrowers list
        fetchBorrowers();
        setShowForm(false);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Error adding borrower');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchBorrowers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken && !ENABLE_DEMO_MODE) {
        setErrorMessage('Authentication required. Please sign in again.');
        return;
      }

      const token = accessToken || 'dummy-token';
      const baseUrl = API_BASE_URL || '';

      const response = await fetch(`${baseUrl}/api/borrowers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBorrowers(data);
      }
    } catch (err) {
      console.error('Failed to fetch borrowers:', err);
    }
  };

  const filteredBorrowers = borrowers.filter(client => {
    if (!searchTerm) return true;
    const searchFields = `${client.full_name || ''} ${client.first_name || ''} ${client.last_name || ''}`;
    let addressText = '';
    if (client.person_address && client.person_address.length > 0) {
      const address = client.person_address[0];
      addressText = `${address.line1 || ''} ${address.city || ''} ${address.state_code || ''} ${address.postal_code || ''}`;
    }
    return (searchFields + addressText).toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      {successMessage && (
        <div style={{
          padding: '10px 16px',
          marginBottom: '20px',
          backgroundColor: 'rgba(34,197,94,0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid var(--success)',
          color: 'var(--success)'
        }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div style={{
          padding: '10px 16px',
          marginBottom: '20px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid var(--error)',
          color: 'var(--error)'
        }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
          {errorMessage}
        </div>
      )}

      {showForm && (
        <div>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>Add New Borrower</h2>
          <form onSubmit={handleBorrowerSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  First Name
                </label>
                <input
                  value={borrowerForm.firstName || ''}
                  onChange={e => setBorrowerForm({ ...borrowerForm, firstName: e.target.value })}
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Last Name
                </label>
                <input
                  value={borrowerForm.lastName || ''}
                  onChange={e => setBorrowerForm({ ...borrowerForm, lastName: e.target.value })}
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Address
                </label>
                <input
                  value={borrowerForm.address || ''}
                  onChange={e => setBorrowerForm({ ...borrowerForm, address: e.target.value })}
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  City
                </label>
                <input
                  value={borrowerForm.city || ''}
                  onChange={e => setBorrowerForm({ ...borrowerForm, city: e.target.value })}
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  State
                </label>
                <input
                  value={borrowerForm.state || ''}
                  onChange={e => setBorrowerForm({ ...borrowerForm, state: e.target.value })}
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Zip Code
                </label>
                <input
                  value={borrowerForm.zipCode || ''}
                  onChange={e => setBorrowerForm({ ...borrowerForm, zipCode: e.target.value })}
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '14px 24px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius)',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  Add Borrower
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {!showForm && (
        <div>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ fontSize: '24px' }}>Borrowers Directory</h2>
            <div style={{ color: 'var(--text-muted)' }}>
              {filteredBorrowers.length} records found
            </div>
          </div>
          
          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              padding: '40px',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i> Loading...
            </div>
          ) : filteredBorrowers.length === 0 ? (
            <div style={{ 
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-muted)',
              background: 'var(--panel-secondary)',
              borderRadius: 'var(--border-radius)',
              marginTop: '20px'
            }}>
              <i className="fas fa-search" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <p>No borrowers found</p>
              <button
                onClick={() => setShowForm(true)}
                style={{ 
                  marginTop: '10px',
                  padding: '8px 16px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  cursor: 'pointer'
                }}
              >
                Add Borrower
              </button>
            </div>
          ) : (
            <div className="property-grid">
              {filteredBorrowers.map(client => {
                const address = client.person_address && client.person_address.length > 0
                  ? client.person_address[0]
                  : null;
                
                return (
                  <div key={client.person_id} className="property-card">
                    <div className="property-status status-active">Borrower</div>
                    <div className="property-header">
                      <div className="property-address">
                        {`${client.first_name || ''} ${client.last_name || ''}`}
                      </div>
                      <div className="property-type">
                        {address ? `${address.city || ''}, ${address.state_code || ''}` : 'No address'}
                      </div>
                    </div>
                    <div className="property-metrics">
                      <div>
                        <div className="property-metric-value">
                          <i className="fas fa-map-marker-alt" style={{ fontSize: '14px', marginRight: '4px' }}></i>
                          {address ? (address.line1 || 'N/A') : 'No address'}
                        </div>
                        <div className="property-metric-label">Address</div>
                      </div>
                      <div>
                        <div className="property-metric-value">
                          {address ? (address.postal_code || 'N/A') : 'N/A'}
                        </div>
                        <div className="property-metric-label">Zip Code</div>
                      </div>
                    </div>
                    <div className="property-alerts">
                      <i className="fas fa-clock"></i> Added: {new Date(client.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
          zIndex: 100
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1) rotate(90deg)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1) rotate(0deg)';
        }}
      >
        <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
      </button>
    </div>
  );
}

export default BorrowersView;