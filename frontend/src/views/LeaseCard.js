import React, { useState } from 'react';
import LeaseInvoicesModal from './LeaseInvoicesModal';

export default function LeaseCard({ lease, property, tenant, onEdit, onDelete }) {
  const [showInvoices, setShowInvoices] = useState(false);

  return (
    <>
      <div key={lease.lease_id} className="property-card">
        <div className={`property-status status-${lease.status === 'active' ? 'active' : 'inactive'}`}>
          {lease.status?.toUpperCase() || 'LEASE'}
        </div>

        <div className="property-header">
          <div className="property-address">
            {lease.lease_number || `Lease ${lease.lease_id?.substring(0, 8)}`}
          </div>
          <div className="property-type">
            {property?.address || 'Property not found'}
          </div>
        </div>

        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <i className="fas fa-user" style={{ fontSize: '14px', color: 'var(--accent-primary)', width: '20px', textAlign: 'center' }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {tenant?.full_name || 'Tenant not found'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tenant
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <i className="fas fa-calendar" style={{ fontSize: '14px', color: 'var(--accent-primary)', width: '20px', textAlign: 'center' }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                {lease.start_date ? new Date(lease.start_date).toLocaleDateString() : 'Start N/A'} — {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'End N/A'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Lease Period
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-dollar-sign" style={{ fontSize: '14px', color: 'var(--accent-primary)', width: '20px', textAlign: 'center' }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                ${lease.monthly_rent?.toLocaleString() || '0'} / month
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Monthly Rent
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '20px 20px 12px 20px', borderTop: '1px solid var(--border)' }}>
          <small style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Created {lease.created_at ? new Date(lease.created_at).toLocaleDateString() : 'recently'}
          </small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowInvoices(true)}
              className="btn-secondary"
              style={{
                background: 'var(--panel-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <i className="fas fa-file-invoice-dollar" style={{ marginRight: '6px' }}></i>
              Pagos
            </button>
            <button
              onClick={onEdit}
              style={{
                background: 'var(--panel-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'var(--accent-primary)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--panel-secondary)'; e.target.style.color = 'var(--accent-primary)'; }}
            >
              <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
              Edit
            </button>
            <button
              onClick={onDelete}
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
              onMouseEnter={(e) => { e.target.style.background = 'var(--error)'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--panel-secondary)'; e.target.style.color = 'var(--error)'; }}
            >
              <i className="fas fa-trash-alt" style={{ marginRight: '6px' }}></i>
              Delete
            </button>
          </div>
        </div>
      </div>
      {showInvoices && <LeaseInvoicesModal lease={lease} property={property} tenant={tenant} onClose={() => setShowInvoices(false)} />}
    </>
  );
}