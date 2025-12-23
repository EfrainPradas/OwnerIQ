import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../../config';

const TENANCY_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'delinquent', label: 'Delinquent' },
  { value: 'ended', label: 'Ended' }
];

const LEGAL_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'organization', label: 'Entity' }
];

const DEFAULT_COUNTRY = 'US';

const buildEmptyTenantForm = () => ({
  person: {
    legal_type: 'individual',
    first_name: '',
    last_name: '',
    preferred_name: '',
    company_name: '',
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
  },
  tenancies: [
    {
      tenancy_id: null,
      property_id: '',
      lease_start: '',
      lease_end: '',
      rent_amount: '',
      status: 'draft',
      property: null
    }
  ],
  removeTenancyIds: []
});

const formatDateValue = (value) => {
  if (!value) {
    return '';
  }
  try {
    return value.toString().split('T')[0];
  } catch (err) {
    return '';
  }
};

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

const getPrimaryContactValue = (tenant, kinds) => {
  if (!tenant) {
    return '';
  }
  const contacts = tenant.contacts || [];
  const normalizedKinds = Array.isArray(kinds)
    ? kinds.map(kind => (kind || '').toLowerCase())
    : [];

  const primary = contacts.find(
    contact => normalizedKinds.includes((contact.kind || '').toLowerCase()) && contact.is_primary
  );
  if (primary) {
    return primary.value || '';
  }
  const fallback = contacts.find(contact =>
    normalizedKinds.includes((contact.kind || '').toLowerCase())
  );
  return fallback?.value || '';
};

const mapTenantToForm = (tenant) => {
  const form = buildEmptyTenantForm();
  if (!tenant) {
    return form;
  }

  form.person.legal_type = tenant.legal_type || 'individual';
  form.person.first_name = tenant.first_name || '';
  form.person.last_name = tenant.last_name || '';
  form.person.preferred_name = tenant.preferred_name || '';
  form.person.company_name = tenant.company_name || '';
  form.person.status = tenant.status || 'active';
  form.person.source = tenant.source || '';
  form.person.notesText = extractNotesText(tenant.notes);

  form.contactEmail = getPrimaryContactValue(tenant, ['email']);
  form.contactPhone = getPrimaryContactValue(tenant, ['phone', 'mobile', 'whatsapp']) || tenant.primary_phone || '';

  const address = Array.isArray(tenant.addresses) && tenant.addresses.length > 0
    ? tenant.addresses[0]
    : null;

  if (address) {
    form.address = {
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state_code: address.state_code || '',
      postal_code: address.postal_code || '',
      country_code: address.country_code || DEFAULT_COUNTRY
    };
  }

  form.tenancies = Array.isArray(tenant.tenancies) && tenant.tenancies.length
    ? tenant.tenancies.map(tenancy => ({
        tenancy_id: tenancy.tenancy_id || null,
        property_id: tenancy.property_id || '',
        lease_start: formatDateValue(tenancy.lease_start),
        lease_end: formatDateValue(tenancy.lease_end),
        rent_amount: tenancy.rent_amount !== null && tenancy.rent_amount !== undefined
          ? String(tenancy.rent_amount)
          : '',
        status: tenancy.status || 'draft',
        property: tenancy.property || null
      }))
    : buildEmptyTenantForm().tenancies;

  form.removeTenancyIds = [];

  return form;
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
    kind: 'home',
    line1: address.line1,
    line2: address.line2 || null,
    city: address.city || null,
    state_code: address.state_code || null,
    postal_code: address.postal_code || null,
    country_code: address.country_code || DEFAULT_COUNTRY,
    is_primary: true
  }];
};

const buildTenanciesPayload = (form) => {
  return form.tenancies
    .filter(tenancy => tenancy && tenancy.property_id)
    .map(tenancy => ({
      tenancy_id: tenancy.tenancy_id || undefined,
      property_id: tenancy.property_id,
      lease_start: tenancy.lease_start || null,
      lease_end: tenancy.lease_end || null,
      rent_amount: tenancy.rent_amount !== '' && tenancy.rent_amount !== null
        ? parseFloat(tenancy.rent_amount)
        : null,
      status: tenancy.status || 'draft'
    }));
};

const renderTenancyDetails = (tenancy) => {
  const property = tenancy.property;
  const leaseRange = [
    tenancy.lease_start ? new Date(tenancy.lease_start).toLocaleDateString() : 'Start N/A',
    tenancy.lease_end ? new Date(tenancy.lease_end).toLocaleDateString() : 'End N/A'
  ].join(' — ');

  return (
    <div
      key={tenancy.tenancy_id || tenancy.property_id || Math.random().toString(36)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--panel-secondary)',
        borderRadius: 'var(--border-radius)',
        padding: '12px 16px',
        marginTop: '8px'
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{property?.address || 'Unassigned property'}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{leaseRange}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600 }}>
          {tenancy.rent_amount !== null && tenancy.rent_amount !== undefined && tenancy.rent_amount !== ''
            ? `$${tenancy.rent_amount}`
            : 'Rent N/A'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {tenancy.status ? tenancy.status.toUpperCase() : 'DRAFT'}
        </div>
      </div>
    </div>
  );
};

export default function TenantsView({ tenants, setTenants, isLoading, searchTerm, refreshTenants }) {
  const [showForm, setShowForm] = useState(false);
  const [tenantForm, setTenantForm] = useState(buildEmptyTenantForm());
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [availableProperties, setAvailableProperties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  const resolveAuthToken = useCallback(async () => {
    const session = await supabase.auth.session();
    const accessToken = session?.access_token;
    if (!accessToken && !ENABLE_DEMO_MODE) {
      throw new Error('Authentication required. Please sign in again.');
    }
    return accessToken || 'dummy-token';
  }, []);

  const fetchAvailableProperties = useCallback(async () => {
    setIsLoadingProperties(true);
    try {
      const token = await resolveAuthToken();
      const response = await fetch(`${API_BASE_URL || ''}/api/properties/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Unable to load available properties');
      }
      const data = await response.json();
      setAvailableProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch available properties:', error);
      setAvailableProperties([]);
    } finally {
      setIsLoadingProperties(false);
    }
  }, [resolveAuthToken]);

  useEffect(() => {
    fetchAvailableProperties();
  }, [fetchAvailableProperties, showForm]);

  const propertyLookup = useMemo(() => {
    const map = new Map();
    (availableProperties || []).forEach(property => {
      if (property && property.property_id) {
        map.set(property.property_id, property);
      }
    });
    (tenants || []).forEach(tenant => {
      (tenant.tenancies || []).forEach(tenancy => {
        if (tenancy?.property?.property_id && !map.has(tenancy.property.property_id)) {
          map.set(tenancy.property.property_id, tenancy.property);
        }
      });
    });
    (tenantForm.tenancies || []).forEach(tenancy => {
      if (tenancy?.property?.property_id && !map.has(tenancy.property.property_id)) {
        map.set(tenancy.property.property_id, tenancy.property);
      }
    });
    return map;
  }, [availableProperties, tenants, tenantForm.tenancies]);

  const allPropertyOptions = useMemo(() => Array.from(propertyLookup.values()), [propertyLookup]);

  const filteredTenants = useMemo(() => {
    if (!searchTerm) {
      return tenants;
    }
    const lowered = searchTerm.toLowerCase();
    return tenants.filter(tenant => {
      const baseFields = [
        tenant.full_name,
        tenant.first_name,
        tenant.last_name,
        tenant.preferred_name,
        tenant.company_name,
        tenant.primary_email,
        tenant.primary_phone
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const contactFields = (tenant.contacts || [])
        .map(contact => contact.value || '')
        .join(' ')
        .toLowerCase();

      const propertyFields = (tenant.tenancies || [])
        .map(tenancy => tenancy.property?.address || '')
        .join(' ')
        .toLowerCase();

      return (
        baseFields.includes(lowered) ||
        contactFields.includes(lowered) ||
        propertyFields.includes(lowered)
      );
    });
  }, [tenants, searchTerm]);

  const resetForm = useCallback(() => {
    setTenantForm(buildEmptyTenantForm());
    setEditingTenantId(null);
    setFormMessage({ type: '', text: '' });
  }, []);

  const toggleForm = (open) => {
    if (open) {
      resetForm();
    }
    setShowForm(open);
  };

  const handleAddTenancyRow = () => {
    setTenantForm(prev => ({
      ...prev,
      tenancies: [
        ...prev.tenancies,
        {
          tenancy_id: null,
          property_id: '',
          lease_start: '',
          lease_end: '',
          rent_amount: '',
          status: 'draft',
          property: null
        }
      ]
    }));
  };

  const handleRemoveTenancyRow = (index) => {
    setTenantForm(prev => {
      const nextTenancies = [...prev.tenancies];
      const [removed] = nextTenancies.splice(index, 1);
      const nextRemovals = new Set(prev.removeTenancyIds || []);
      if (removed?.tenancy_id) {
        nextRemovals.add(removed.tenancy_id);
      }
      return {
        ...prev,
        tenancies: nextTenancies.length ? nextTenancies : buildEmptyTenantForm().tenancies,
        removeTenancyIds: Array.from(nextRemovals)
      };
    });
  };

  const handleTenancyFieldChange = (index, field, value) => {
    setTenantForm(prev => {
      const updated = [...prev.tenancies];
      const current = { ...updated[index], [field]: value };
      if (field === 'property_id') {
        current.property = propertyLookup.get(value) || null;
      }
      updated[index] = current;
      return { ...prev, tenancies: updated };
    });
  };

  const handleLegalTypeChange = (nextType) => {
    setTenantForm(prev => ({
      ...prev,
      person: {
        ...prev.person,
        legal_type: nextType,
        company_name: nextType === 'organization' ? prev.person.company_name : '',
        first_name: nextType === 'individual' ? prev.person.first_name : '',
        last_name: nextType === 'individual' ? prev.person.last_name : ''
      }
    }));
  };

  const handleEditTenant = (tenant) => {
    setEditingTenantId(tenant.person_id);
    setTenantForm(mapTenantToForm(tenant));
    setFormMessage({ type: '', text: '' });
    setShowForm(true);
  };

  const handleTenantSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    try {
      const token = await resolveAuthToken();
      const legalType = tenantForm.person.legal_type || 'individual';
      const payload = {
        person: {
          legal_type: legalType,
          first_name: legalType === 'individual' ? tenantForm.person.first_name || null : null,
          last_name: legalType === 'individual' ? tenantForm.person.last_name || null : null,
          preferred_name: tenantForm.person.preferred_name || null,
          company_name: legalType === 'organization' ? tenantForm.person.company_name || null : null,
          status: tenantForm.person.status || 'active',
          source: tenantForm.person.source || null,
          notes: tenantForm.person.notesText
            ? { text: tenantForm.person.notesText }
            : {}
        },
        contacts: buildContactsPayload(tenantForm),
        addresses: buildAddressesPayload(tenantForm),
        tenancies: buildTenanciesPayload(tenantForm),
        removeTenancyIds: tenantForm.removeTenancyIds || []
      };

      const isEditing = Boolean(editingTenantId);
      const endpoint = isEditing
        ? `${API_BASE_URL || ''}/api/clients/tenants/${editingTenantId}`
        : `${API_BASE_URL || ''}/api/clients/tenants`;

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
        throw new Error(error.error || 'Unable to save tenant');
      }

      const tenant = await response.json();
      setTenants(prev => {
        if (!tenant) {
          return prev;
        }
        if (isEditing) {
          return prev.map(item => (item.person_id === tenant.person_id ? tenant : item));
        }
        return [tenant, ...prev];
      });

      await Promise.all([
        refreshTenants?.(),
        fetchAvailableProperties()
      ]);

      setFormMessage({
        type: 'success',
        text: isEditing ? 'Tenant updated successfully.' : 'Tenant created successfully.'
      });
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to submit tenant form:', error);
      setFormMessage({ type: 'error', text: error.message || 'Unable to save tenant' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (personId) => {
    if (!window.confirm('Delete this tenant and related roles?')) {
      return;
    }
    try {
      const token = await resolveAuthToken();
      const response = await fetch(`${API_BASE_URL || ''}/api/clients/tenants/${personId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Unable to delete tenant');
      }

      setTenants(prev => prev.filter(tenant => tenant.person_id !== personId));
      await Promise.all([
        refreshTenants?.(),
        fetchAvailableProperties()
      ]);

      setFormMessage({ type: 'success', text: 'Tenant removed successfully.' });
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      setFormMessage({ type: 'error', text: error.message || 'Unable to delete tenant' });
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
        <form onSubmit={handleTenantSubmit}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}
          >
            <h2 style={{ margin: 0, fontSize: '24px' }}>
              {editingTenantId ? 'Edit Tenant' : 'Add New Tenant'}
            </h2>
            <button
              type="button"
              onClick={() => {
                toggleForm(false);
              }}
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Legal Type</label>
              <select
                value={tenantForm.person.legal_type}
                onChange={e => handleLegalTypeChange(e.target.value)}
                className="form-input"
              >
                {LEGAL_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {tenantForm.person.legal_type === 'individual' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label">First Name</label>
                  <input
                    className="form-input"
                    placeholder="Jane"
                    value={tenantForm.person.first_name}
                    onChange={e =>
                      setTenantForm(prev => ({
                        ...prev,
                        person: { ...prev.person, first_name: e.target.value }
                      }))
                    }
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-input"
                    placeholder="Doe"
                    value={tenantForm.person.last_name}
                    onChange={e =>
                      setTenantForm(prev => ({
                        ...prev,
                        person: { ...prev.person, last_name: e.target.value }
                      }))
                    }
                  />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Company Name</label>
                <input
                  className="form-input"
                  placeholder="Acme Holdings LLC"
                  value={tenantForm.person.company_name}
                  onChange={e =>
                    setTenantForm(prev => ({
                      ...prev,
                      person: { ...prev.person, company_name: e.target.value }
                    }))
                  }
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Preferred Name</label>
              <input
                className="form-input"
                placeholder="Optional"
                value={tenantForm.person.preferred_name}
                onChange={e =>
                  setTenantForm(prev => ({
                    ...prev,
                    person: { ...prev.person, preferred_name: e.target.value }
                  }))
                }
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={tenantForm.person.status}
                onChange={e =>
                  setTenantForm(prev => ({
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

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Source</label>
              <input
                className="form-input"
                placeholder="Referral, Zillow, etc."
                value={tenantForm.person.source}
                onChange={e =>
                  setTenantForm(prev => ({
                    ...prev,
                    person: { ...prev.person, source: e.target.value }
                  }))
                }
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="tenant@example.com"
                value={tenantForm.contactEmail}
                onChange={e => setTenantForm(prev => ({ ...prev, contactEmail: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                placeholder="+1 (555) 123-4567"
                value={tenantForm.contactPhone}
                onChange={e => setTenantForm(prev => ({ ...prev, contactPhone: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Mailing Address</h3>
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
                  value={tenantForm.address.line1}
                  onChange={e =>
                    setTenantForm(prev => ({
                      ...prev,
                      address: { ...prev.address, line1: e.target.value }
                    }))
                  }
                  placeholder="123 Main St"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Address Line 2</label>
                <input
                  className="form-input"
                  value={tenantForm.address.line2}
                  onChange={e =>
                    setTenantForm(prev => ({
                      ...prev,
                      address: { ...prev.address, line2: e.target.value }
                    }))
                  }
                  placeholder="Apt, Suite, etc."
                />
              </div>
              <div className="form-field">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  value={tenantForm.address.city}
                  onChange={e =>
                    setTenantForm(prev => ({
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
                  value={tenantForm.address.state_code}
                  onChange={e =>
                    setTenantForm(prev => ({
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
                  value={tenantForm.address.postal_code}
                  onChange={e =>
                    setTenantForm(prev => ({
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
                  value={tenantForm.address.country_code}
                  onChange={e =>
                    setTenantForm(prev => ({
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
              placeholder="Key details, preferences, or compliance notes"
              value={tenantForm.person.notesText}
              onChange={e =>
                setTenantForm(prev => ({
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
              {isSubmitting ? 'Saving…' : editingTenantId ? 'Update Tenant' : 'Create Tenant'}
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
            <h2 style={{ fontSize: '24px' }}>Tenants Directory</h2>
            <div style={{ color: 'var(--text-muted)' }}>{filteredTenants.length} records</div>
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
          ) : filteredTenants.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-muted)',
                background: 'var(--panel-secondary)',
                borderRadius: 'var(--border-radius)'
              }}
            >
              <i className="fas fa-users" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <p>No tenants found.</p>
              <button
                onClick={() => toggleForm(true)}
                className="btn-primary"
              >
                Add Tenant
              </button>
            </div>
          ) : (
            <div className="property-grid">
              {filteredTenants.map(tenant => (
                <div key={tenant.person_id} className="property-card">
                  <div className="property-status status-active">
                    {tenant.status ? tenant.status.toUpperCase() : 'TENANT'}
                  </div>
                  <div className="property-header">
                    <div className="property-address">
                      {tenant.full_name || tenant.preferred_name || tenant.company_name || 'Unnamed tenant'}
                    </div>
                    <div className="property-type">
                      {tenant.legal_type === 'organization' ? 'Entity' : 'Individual'}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-envelope" style={{
                        fontSize: '14px',
                        color: 'var(--accent-primary)',
                        width: '20px',
                        textAlign: 'center'
                      }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--text-primary)',
                          wordBreak: 'break-word'
                        }}>
                          {tenant.primary_email || getPrimaryContactValue(tenant, ['email']) || 'No email'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginTop: '2px'
                        }}>
                          Email
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-phone" style={{
                        fontSize: '14px',
                        color: 'var(--accent-primary)',
                        width: '20px',
                        textAlign: 'center'
                      }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--text-primary)',
                          wordBreak: 'break-word'
                        }}>
                          {tenant.primary_phone || getPrimaryContactValue(tenant, ['phone', 'mobile']) || 'No phone'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginTop: '2px'
                        }}>
                          Phone
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    {(tenant.leases || tenant.tenancies || []).length
                      ? tenant.tenancies.map(renderTenancyDetails)
                      : (
                        <div
                          style={{
                            background: 'var(--panel-secondary)',
                            borderRadius: 'var(--border-radius)',
                            padding: '12px 16px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          No active property assignments.
                        </div>
                        )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '20px',
                      padding: '20px 20px 12px 20px',
                      borderTop: '1px solid var(--border)'
                    }}
                  >
                    <small style={{
                      color: 'var(--text-muted)',
                      fontSize: '13px'
                    }}>
                      Added {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'recently'}
                    </small>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEditTenant(tenant)}
                        style={{
                          background: 'var(--panel-secondary)',
                          border: '1px solid var(--border)',
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12x',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--accent-primary)';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'var(--panel-secondary)';
                          e.target.style.color = 'var(--accent-primary)';
                        }}
                      >
                        <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant.person_id)}
                        style={{
                          background: 'var(--panel-secondary)',
                          border: '1px solid var(--border)',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--error)';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'var(--panel-secondary)';
                          e.target.style.color = 'var(--error)';
                        }}
                      >
                        <i className="fas fa-trash-alt" style={{ marginRight: '6px' }}></i>
                        Delete
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
