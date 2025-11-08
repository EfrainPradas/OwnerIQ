import React, { useState, useEffect } from 'react';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../config';
import { supabase } from '../supabaseClient';

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
});

const formatDateValue = (value) => {
  if (!value) return '';
  try {
    return value.toString().split('T')[0];
  } catch (err) {
    return '';
  }
};

export default function LeaseForm({ lease, properties, tenants, onClose, onSave, isEditing }) {
  const [leaseForm, setLeaseForm] = useState(lease ? {
    ...lease,
    start_date: formatDateValue(lease.start_date),
    end_date: formatDateValue(lease.end_date),
  } : buildEmptyLeaseForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const resolveAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken && !ENABLE_DEMO_MODE) {
      throw new Error('Authentication required.');
    }
    return accessToken || 'dummy-token';
  };

  const handleLeaseSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    try {
        const token = await resolveAuthToken();
        const payload = {
            ...leaseForm,
            monthly_rent: leaseForm.monthly_rent ? parseFloat(leaseForm.monthly_rent) : null,
            security_deposit: leaseForm.security_deposit ? parseFloat(leaseForm.security_deposit) : null,
        };

        const endpoint = isEditing
            ? `${API_BASE_URL || ''}/api/leases/${lease.lease_id}`
            : `${API_BASE_URL || ''}/api/leases`;

        const response = await fetch(endpoint, {
            method: isEditing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Unable to save lease');
        }

        onSave();
        onClose();
    } catch (error) {
        console.error('Failed to submit lease form:', error);
        setFormMessage({ type: 'error', text: error.message || 'Unable to save lease' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setLeaseForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{isEditing ? 'Edit Lease' : 'Create New Lease'}</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleLeaseSubmit}>
            {formMessage.text && <div className={`alert alert-${formMessage.type}`}>{formMessage.text}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {isEditing && leaseForm.lease_number && (
                <div className="form-field">
                  <label className="form-label">Lease Number</label>
                  <input className="form-input" value={leaseForm.lease_number} readOnly style={{ background: 'var(--panel-secondary)', cursor: 'not-allowed' }} />
                </div>
              )}
              <div className="form-field">
                <label className="form-label">Property</label>
                <select className="form-input" value={leaseForm.property_id} onChange={e => handleInputChange('property_id', e.target.value)} required>
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.property_id} value={p.property_id}>{p.address}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Tenant</label>
                <select className="form-input" value={leaseForm.tenant_person_id} onChange={e => handleInputChange('tenant_person_id', e.target.value)} required>
                  <option value="">Select tenant</option>
                  {tenants.map(t => <option key={t.person_id} value={t.person_id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={leaseForm.status} onChange={e => handleInputChange('status', e.target.value)}>
                  {LEASE_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={leaseForm.start_date} onChange={e => handleInputChange('start_date', e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="form-label">End Date</label>
                <input className="form-input" type="date" value={leaseForm.end_date} onChange={e => handleInputChange('end_date', e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="form-label">Monthly Rent ($)</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="2500.00" value={leaseForm.monthly_rent} onChange={e => handleInputChange('monthly_rent', e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="form-label">Security Deposit ($)</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="2500.00" value={leaseForm.security_deposit} onChange={e => handleInputChange('security_deposit', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Rent Due Day</label>
                <input className="form-input" type="number" min="1" max="28" value={leaseForm.rent_due_day} onChange={e => handleInputChange('rent_due_day', parseInt(e.target.value) || 1)} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Lease Settings</h3>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={leaseForm.auto_generate_invoices} onChange={e => handleInputChange('auto_generate_invoices', e.target.checked)} />
                  Auto-generate invoices
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={leaseForm.allow_partial_payments} onChange={e => handleInputChange('allow_partial_payments', e.target.checked)} />
                  Allow partial payments
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={4} placeholder="Additional lease terms, special conditions, etc." value={leaseForm.notes} onChange={e => handleInputChange('notes', e.target.value)} />
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Lease' : 'Create Lease'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}