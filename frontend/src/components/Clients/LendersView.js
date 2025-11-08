import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../../config';

const DEFAULT_COUNTRY = 'US';

const buildEmptyLenderForm = () => ({
  person: {
    legal_type: 'organization',
    company_name: '',
    first_name: '',
    last_name: '',
    preferred_name: '',
    status: 'active',
    source: '',
    notesText: ''
  },
  contactEmail: '',
  contactPhone: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state_code: '',
    postal_code: '',
    country_code: DEFAULT_COUNTRY
  }
});

const extractNotesText = (notes) => {
  if (!notes) {
    return '';
  }
  if (typeof notes === 'string') {
    return notes;
  }
  if (typeof notes === 'object' && notes !== null) {
    if (typeof notes.text === 'string') {
      return notes.text;
    }
    return JSON.stringify(notes);
  }
  return '';
};

const buildContactsPayload = (form) => {
  const contacts = [];
  if (form.contactEmail) {
    contacts.push({
      kind: 'email',
      value: form.contactEmail,
      is_primary: true
    });
  }
  if (form.contactPhone) {
    contacts.push({
      kind: 'phone',
      value: form.contactPhone,
      is_primary: true
    });
  }
  return contacts;
};

const buildAddressesPayload = (form) => {
  const { address } = form;
  if (!address || !address.line1) {
    return [];
  }
  return [{
    kind: 'office',
    line1: address.line1,
    line2: address.line2 || null,
    city: address.city || null,
    state_code: address.state_code || null,
    postal_code: address.postal_code || null,
    country_code: address.country_code || DEFAULT_COUNTRY,
    is_primary: true
  }];
};

export default function LendersView({ lenders, setLenders, isLoading, searchTerm, refreshLenders }) {
  const [showForm, setShowForm] = useState(false);
  const [lenderForm, setLenderForm] = useState(buildEmptyLenderForm());
  const [editingLenderId, setEditingLenderId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const resolveAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken && !ENABLE_DEMO_MODE) {
      throw new Error('Authentication required. Please sign in again.');
    }
    return accessToken || 'dummy-token';
  }, []);

  const filteredLenders = useMemo(() => {
    if (!searchTerm) {
      return lenders;
    }
    const lowered = searchTerm.toLowerCase();
    return lenders.filter(lender => {
      const baseFields = [
        lender.full_name,
        lender.company_name,
        lender.preferred_name,
        lender.first_name,
        lender.last_name,
        lender.primary_email,
        lender.primary_phone
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const contactFields = (lender.contacts || [])
        .map(contact => contact.value || '')
        .join(' ')
        .toLowerCase();

      const addressFields = (lender.addresses || [])
        .map(address => [address.line1, address.city, address.state_code, address.postal_code].join(' '))
        .join(' ')
        .toLowerCase();

      return (
        baseFields.includes(lowered) ||
        contactFields.includes(lowered) ||
        addressFields.includes(lowered)
      );
    });
  }, [lenders, searchTerm]);

  const resetForm = useCallback(() => {
    setLenderForm(buildEmptyLenderForm());
    setEditingLenderId(null);
    setFormMessage({ type: '', text: '' });
  }, []);

  const toggleForm = (open) => {
    if (open) {
      resetForm();
    }
    setShowForm(open);
  };

  const mapLenderToForm = (lender) => {
    const form = buildEmptyLenderForm();
    if (!lender) {
      return form;
    }
    form.person.legal_type = lender.legal_type || 'organization';
    form.person.company_name = lender.company_name || lender.full_name || '';
    form.person.first_name = lender.first_name || '';
    form.person.last_name = lender.last_name || '';
    form.person.preferred_name = lender.preferred_name || '';
    form.person.status = lender.status || 'active';
    form.person.source = lender.source || '';
    form.person.notesText = extractNotesText(lender.notes);

    const primaryEmail = lender.primary_email
      || (lender.contacts || []).find(contact => (contact.kind || '').toLowerCase() === 'email')?.value
      || '';
    const primaryPhone = lender.primary_phone
      || (lender.contacts || []).find(contact => (contact.kind || '').toLowerCase() === 'phone')?.value
      || '';

    form.contactEmail = primaryEmail;
    form.contactPhone = primaryPhone;

    if (Array.isArray(lender.addresses) && lender.addresses.length) {
      const address = lender.addresses[0];
      form.address = {
        line1: address.line1 || '',
        line2: address.line2 || '',
        city: address.city || '',
        state_code: address.state_code || '',
        postal_code: address.postal_code || '',
        country_code: address.country_code || DEFAULT_COUNTRY
      };
    }

    return form;
  };

  const handleEditLender = (lender) => {
    setEditingLenderId(lender.person_id);
    setLenderForm(mapLenderToForm(lender));
    setFormMessage({ type: '', text: '' });
    setShowForm(true);
  };

  const handleSubmitLender = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    try {
      const token = await resolveAuthToken();
      const legalType = lenderForm.person.legal_type || 'organization';
      const payload = {
        person: {
          legal_type: legalType,
          company_name: legalType === 'organization'
            ? lenderForm.person.company_name || null
            : null,
          first_name: legalType === 'individual'
            ? lenderForm.person.first_name || null
            : null,
          last_name: legalType === 'individual'
            ? lenderForm.person.last_name || null
            : null,
          preferred_name: lenderForm.person.preferred_name || null,
          status: lenderForm.person.status || 'active',
          source: lenderForm.person.source || null,
          notes: lenderForm.person.notesText
            ? { text: lenderForm.person.notesText }
            : {}
        },
        contacts: buildContactsPayload(lenderForm),
        addresses: buildAddressesPayload(lenderForm)
      };

      const isEditing = Boolean(editingLenderId);
      const endpoint = isEditing
        ? `${API_BASE_URL || ''}/api/clients/lenders/${editingLenderId}`
        : `${API_BASE_URL || ''}/api/clients/lenders`;

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Unable to save lender');
      }

      const lender = await response.json();
      setLenders(prev => {
        if (!lender) {
          return prev;
        }
        if (isEditing) {
          return prev.map(item => (item.person_id === lender.person_id ? lender : item));
        }
        return [lender, ...prev];
      });

      await refreshLenders?.();
      setFormMessage({
        type: 'success',
        text: isEditing ? 'Lender updated successfully.' : 'Lender added successfully.'
      });
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to submit lender form:', error);
      setFormMessage({ type: 'error', text: error.message || 'Unable to save lender' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLender = async (personId) => {
    if (!window.confirm('Delete this lender?')) {
      return;
    }
    try {
      const token = await resolveAuthToken();
      const response = await fetch(`${API_BASE_URL || ''}/api/clients/lenders/${personId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Unable to delete lender');
      }

      setLenders(prev => prev.filter(lender => lender.person_id !== personId));
      await refreshLenders?.();
      setFormMessage({ type: 'success', text: 'Lender removed successfully.' });
    } catch (error) {
      console.error('Failed to delete lender:', error);
      setFormMessage({ type: 'error', text: error.message || 'Unable to delete lender' });
    }
  };

  const renderMessageBanner = () => {
    if (!formMessage.text) {
      return null;
    }
    const isSuccess = formMessage.type === 'success';
    return (
      <div
        style={{
          padding: '10px 16px',
          marginBottom: '20px',
          backgroundColor: isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          borderRadius: '8px',
          borderLeft: `4px solid ${isSuccess ? 'var(--success)' : 'var(--error)'}`,
          color: isSuccess ? 'var(--success)' : 'var(--error)'
        }}
      >
        <i
          className={`fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
          style={{ marginRight: '8px' }}
        ></i>
        {formMessage.text}
      </div>
    );
  };

  return (
    <div>
      {renderMessageBanner()}

      {showForm ? (
        <form onSubmit={handleSubmitLender}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}
          >
            <h2 style={{ margin: 0, fontSize: '24px' }}>
              {editingLenderId ? 'Edit Lender' : 'Add New Lender'}
            </h2>
            <button
              type="button"
              onClick={() => toggleForm(false)}
              style={{
                border: 'none',
                background: 'var(--panel-secondary)',
                color: 'var(--text-muted)',
                padding: '8px 12px',
                borderRadius: 'var(--border-radius)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div className="form-field">
              <label className="form-label">Legal Type</label>
              <select
                className="form-input"
                value={lenderForm.person.legal_type}
                onChange={e =>
                  setLenderForm(prev => ({
                    ...prev,
                    person: { ...prev.person, legal_type: e.target.value }
                  }))
                }
              >
                <option value="organization">Entity</option>
                <option value="individual">Individual</option>
              </select>
            </div>

            {lenderForm.person.legal_type === 'organization' ? (
              <div className="form-field">
                <label className="form-label">Organization Name</label>
                <input
                  className="form-input"
                  placeholder="ABC Lending Partners"
                  value={lenderForm.person.company_name}
                  onChange={e =>
                    setLenderForm(prev => ({
                      ...prev,
                      person: { ...prev.person, company_name: e.target.value }
                    }))
                  }
                />
              </div>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label">First Name</label>
                  <input
                    className="form-input"
                    value={lenderForm.person.first_name}
                    onChange={e =>
                      setLenderForm(prev => ({
                        ...prev,
                        person: { ...prev.person, first_name: e.target.value }
                      }))
                    }
                    placeholder="Jane"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-input"
                    value={lenderForm.person.last_name}
                    onChange={e =>
                      setLenderForm(prev => ({
                        ...prev,
                        person: { ...prev.person, last_name: e.target.value }
                      }))
                    }
                    placeholder="Doe"
                  />
                </div>
              </>
            )}

            <div className="form-field">
              <label className="form-label">Preferred Name</label>
              <input
                className="form-input"
                value={lenderForm.person.preferred_name}
                onChange={e =>
                  setLenderForm(prev => ({
                    ...prev,
                    person: { ...prev.person, preferred_name: e.target.value }
                  }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={lenderForm.person.status}
                onChange={e =>
                  setLenderForm(prev => ({
                    ...prev,
                    person: { ...prev.person, status: e.target.value }
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="former">Former</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Source</label>
              <input
                className="form-input"
                value={lenderForm.person.source}
                placeholder="Introduction, Conference, etc."
                onChange={e =>
                  setLenderForm(prev => ({
                    ...prev,
                    person: { ...prev.person, source: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-field">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="contact@lender.com"
                value={lenderForm.contactEmail}
                onChange={e => setLenderForm(prev => ({ ...prev, contactEmail: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                placeholder="+1 (555) 234-5678"
                value={lenderForm.contactPhone}
                onChange={e => setLenderForm(prev => ({ ...prev, contactPhone: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Primary Office Address</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
              }}
            >
              <div className="form-field">
                <label className="form-label">Address Line 1</label>
                <input
                  className="form-input"
                  value={lenderForm.address.line1}
                  onChange={e =>
                    setLenderForm(prev => ({
                      ...prev,
                      address: { ...prev.address, line1: e.target.value }
                    }))
                  }
                  placeholder="123 Finance Ave"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Address Line 2</label>
                <input
                  className="form-input"
                  value={lenderForm.address.line2}
                  onChange={e =>
                    setLenderForm(prev => ({
                      ...prev,
                      address: { ...prev.address, line2: e.target.value }
                    }))
                  }
                  placeholder="Suite 450"
                />
              </div>
              <div className="form-field">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  value={lenderForm.address.city}
                  onChange={e =>
                    setLenderForm(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))
                  }
                  placeholder="City"
                />
              </div>
              <div className="form-field">
                <label className="form-label">State</label>
                <input
                  className="form-input"
                  value={lenderForm.address.state_code}
                  onChange={e =>
                    setLenderForm(prev => ({
                      ...prev,
                      address: { ...prev.address, state_code: e.target.value }
                    }))
                  }
                  placeholder="State"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Postal Code</label>
                <input
                  className="form-input"
                  value={lenderForm.address.postal_code}
                  onChange={e =>
                    setLenderForm(prev => ({
                      ...prev,
                      address: { ...prev.address, postal_code: e.target.value }
                    }))
                  }
                  placeholder="ZIP"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Country</label>
                <input
                  className="form-input"
                  value={lenderForm.address.country_code}
                  onChange={e =>
                    setLenderForm(prev => ({
                      ...prev,
                      address: { ...prev.address, country_code: e.target.value }
                    }))
                  }
                  placeholder="US"
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Key relationship history, terms, or reminders"
              value={lenderForm.person.notesText}
              onChange={e =>
                setLenderForm(prev => ({
                  ...prev,
                  person: { ...prev.person, notesText: e.target.value }
                }))
              }
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => toggleForm(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : editingLenderId ? 'Update Lender' : 'Create Lender'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <h2 style={{ fontSize: '24px' }}>Lenders Directory</h2>
            <div style={{ color: 'var(--text-muted)' }}>{filteredLenders.length} records</div>
          </div>

          {isLoading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '40px',
                color: 'var(--text-muted)'
              }}
            >
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
              Loading…
            </div>
          ) : filteredLenders.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-muted)',
                background: 'var(--panel-secondary)',
                borderRadius: 'var(--border-radius)'
              }}
            >
              <i className="fas fa-landmark" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <p>No lenders found.</p>
              <button
                onClick={() => toggleForm(true)}
                className="btn-primary"
              >
                Add Lender
              </button>
            </div>
          ) : (
            <div className="property-grid">
              {filteredLenders.map(lender => (
                <div key={lender.person_id} className="property-card">
                  <div className="property-status status-active">
                    {lender.person?.status ? lender.person.status.toUpperCase() : 'LENDER'}
                  </div>
                  <div className="property-header">
                    <div className="property-address">
                      {lender.full_name || lender.company_name || 'Unnamed lender'}
                    </div>
                    <div className="property-type">
                      {lender.person?.legal_type === 'organization' ? 'Entity' : 'Individual'}
                    </div>
                  </div>

                  <div className="property-metrics">
                    <div>
                      <div className="property-metric-value">
                        <i className="fas fa-envelope" style={{ fontSize: '14px', marginRight: '6px' }}></i>
                        {lender.primary_email ||
                          (lender.contacts || []).find(contact => (contact.kind || '').toLowerCase() === 'email')?.value ||
                          'No email'}
                      </div>
                      <div className="property-metric-label">Email</div>
                    </div>
                    <div>
                      <div className="property-metric-value">
                        <i className="fas fa-phone" style={{ fontSize: '14px', marginRight: '6px' }}></i>
                        {lender.primary_phone ||
                          (lender.contacts || []).find(contact => (contact.kind || '').toLowerCase() === 'phone')?.value ||
                          'No phone'}
                      </div>
                      <div className="property-metric-label">Phone</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {Array.isArray(lender.addresses) && lender.addresses.length
                      ? `${lender.addresses[0].line1 || ''}${lender.addresses[0].city ? `, ${lender.addresses[0].city}` : ''}`
                      : 'No address on file'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '16px'
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)' }}>
                      Added {lender.created_at ? new Date(lender.created_at).toLocaleDateString() : 'recently'}
                    </small>
                    <div>
                      <button
                        onClick={() => handleEditLender(lender)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                          marginRight: '12px'
                        }}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteLender(lender.person_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => toggleForm(!showForm)}
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
