import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../config';
import LeaseForm from './LeaseForm';
import LeaseCard from './LeaseCard';

const LEASE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' }
];

const buildEmptyLeaseForm = () => ({
  lease_id: null,
  lease_number: '',
  property_id: '',
  tenant_person_id: '',
  status: 'draft',
  start_date: '',
  end_date: '',
  monthly_rent: '',
  security_deposit: '',
  rent_due_day: 1,
  auto_generate_invoices: true,
  allow_partial_payments: true,
  notes: '',
  property: null,
  tenant: null
});

const formatDateValue = (value) => {
  if (!value) return '';
  try {
    return value.toString().split('T')[0];
  } catch (err) {
    return '';
  }
};

export default function LeasesView() {
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [modal, setModal] = useState('closed'); // 'closed', 'new', 'edit'
  const [selectedLease, setSelectedLease] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const resolveAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken && !ENABLE_DEMO_MODE) {
      throw new Error('Authentication required. Please sign in again.');
    }
    return accessToken || 'dummy-token';
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await resolveAuthToken();
      const [leasesRes, propertiesRes, tenantsRes] = await Promise.all([
        fetch(`${API_BASE_URL || ''}/api/leases`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL || ''}/api/properties/available`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL || ''}/api/clients/tenants`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!leasesRes.ok) throw new Error('Unable to load leases');
      if (!propertiesRes.ok) throw new Error('Unable to load properties');
      if (!tenantsRes.ok) throw new Error('Unable to load tenants');

      const leasesData = await leasesRes.json();
      const propertiesData = await propertiesRes.json();
      const tenantsData = await tenantsRes.json();

      setLeases(Array.isArray(leasesData) ? leasesData : []);
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);

    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLeases([]);
      setProperties([]);
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const propertyLookup = useMemo(() => {
    const map = new Map();
    (properties || []).forEach(property => {
      if (property && property.property_id) {
        map.set(property.property_id, property);
      }
    });
    return map;
  }, [properties]);

  const tenantLookup = useMemo(() => {
    const map = new Map();
    (tenants || []).forEach(tenant => {
      if (tenant && tenant.person_id) {
        map.set(tenant.person_id, tenant);
      }
    });
    return map;
  }, [tenants]);

  const filteredLeases = useMemo(() => {
    if (!searchTerm) return leases;

    const lowered = searchTerm.toLowerCase();
    return leases.filter(lease => {
      const property = propertyLookup.get(lease.property_id);
      const tenant = tenantLookup.get(lease.tenant_person_id);

      const searchFields = [
        lease.lease_number,
        property?.address,
        tenant?.full_name,
        tenant?.primary_email
      ].filter(Boolean).join(' ').toLowerCase();

      return searchFields.includes(lowered);
    });
  }, [leases, searchTerm, propertyLookup, tenantLookup]);

  const handleOpenForm = (lease = null) => {
    setSelectedLease(lease);
    setModal(lease ? 'edit' : 'new');
  };

  const handleCloseForm = () => {
    setModal('closed');
    setSelectedLease(null);
  };

  const handleDeleteLease = async (leaseId) => {
    if (!window.confirm('Delete this lease? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await resolveAuthToken();
      const response = await fetch(`${API_BASE_URL || ''}/api/leases/${leaseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Unable to delete lease');
      }

      setLeases(prev => prev.filter(lease => lease.lease_id !== leaseId));
      setFormMessage({ type: 'success', text: 'Lease removed successfully.' });
    } catch (error) {
      console.error('Failed to delete lease:', error);
      setFormMessage({ type: 'error', text: error.message || 'Unable to delete lease' });
    }
  };

  const renderMessageBanner = () => {
    if (!formMessage.text) return null;

    const isSuccess = formMessage.type === 'success';

    return (
      <div style={{
        padding: '10px 16px',
        marginBottom: '20px',
        backgroundColor: isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        borderRadius: '8px',
        borderLeft: `4px solid ${isSuccess ? 'var(--success)' : 'var(--error)'}`,
        color: isSuccess ? 'var(--success)' : 'var(--error)'
      }}>
        <i className={`fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
           style={{ marginRight: '8px' }}></i>
        {formMessage.text}
      </div>
    );
  };

  return (
    <div>
      {renderMessageBanner()}

      {modal !== 'closed' ? (
        <LeaseForm
          lease={selectedLease}
          properties={properties}
          tenants={tenants}
          onClose={handleCloseForm}
          onSave={fetchData}
          isEditing={modal === 'edit'}
        />
      ) : (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ fontSize: '24px' }}>Lease Management</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search leases..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)',
                  width: '200px'
                }}
              />
              <div style={{ color: 'var(--text-muted)' }}>
                {filteredLeases.length} records
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '40px',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
              Loading leases...
            </div>
          ) : filteredLeases.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-muted)',
              background: 'var(--panel-secondary)',
              borderRadius: 'var(--border-radius)'
            }}>
              <i className="fas fa-file-contract" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <p>No leases found.</p>
              <button
                onClick={() => handleOpenForm()}
                className="btn-primary"
              >
                Create First Lease
              </button>
            </div>
          ) : (
            <div className="property-grid">
              {filteredLeases.map(lease => (
                <LeaseCard
                  key={lease.lease_id}
                  lease={lease}
                  property={propertyLookup.get(lease.property_id)}
                  tenant={tenantLookup.get(lease.tenant_person_id)}
                  onEdit={() => handleOpenForm(lease)}
                  onDelete={() => handleDeleteLease(lease.lease_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => modal === 'closed' ? handleOpenForm() : handleCloseForm()}
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
        <i className={`fas ${modal !== 'closed' ? 'fa-times' : 'fa-plus'}`}></i>
      </button>
    </div>
  );
}