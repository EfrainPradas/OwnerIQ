import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../config';

export default function LeaseInvoicesModal({ lease, property, tenant, onClose }) {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken && !ENABLE_DEMO_MODE) {
      throw new Error('Authentication required.');
    }
    return accessToken || 'dummy-token';
  };

  const fetchInvoices = async () => {
    if (!lease) return;
    setIsLoading(true);
    setError('');
    try {
      const token = await resolveAuthToken();
      const response = await fetch(`${API_BASE_URL || ''}/api/leases/${lease.lease_id}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to load invoices');
      }
      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [lease]);

  // Filter and sort invoices: from today until end of year, ascending
  const filteredInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);

    return invoices
      .filter(inv => {
        const dueDate = new Date(inv.due_date);
        return dueDate >= today && dueDate <= endOfYear;
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [invoices]);

  const handleRegisterPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    setIsSubmitting(true);
    try {
      const token = await resolveAuthToken();
      const response = await fetch(`${API_BASE_URL || ''}/api/leases/${lease.lease_id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_id: selectedInvoice.invoice_id,
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          payer_name: tenant?.full_name || 'Tenant'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register payment');
      }

      // Refresh invoices
      await fetchInvoices();
      setSelectedInvoice(null);
      setPaymentAmount('');
    } catch (err) {
      setError(err.message);
      console.error('Failed to register payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return '#22c55e';
      case 'partial': return '#f59e0b';
      case 'late': return '#ef4444';
      case 'pending': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const totalDue = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount_due) || 0), 0);
  const paidCount = filteredInvoices.filter(inv => inv.status === 'paid').length;
  const pendingCount = filteredInvoices.filter(inv => inv.status === 'pending').length;
  const lateCount = filteredInvoices.filter(inv => inv.status === 'late').length;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--panel-primary)',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '90%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel-secondary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                <i className="fas fa-file-invoice-dollar" style={{ marginRight: '12px', color: 'var(--accent-primary)' }}></i>
                Payment Schedule
              </h2>
              <div style={{ marginTop: '8px', fontSize: '16px', color: 'var(--text-muted)' }}>
                {lease.lease_number} • {property?.address || 'Property'}
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{
                background: 'var(--panel-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--error)';
                e.target.style.color = 'white';
                e.target.style.borderColor = 'var(--error)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--panel-primary)';
                e.target.style.color = 'var(--text-primary)';
                e.target.style.borderColor = 'var(--border)';
              }}
            >
              ×
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px' }}>
            <div style={{ background: 'var(--panel-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>This Year</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{filteredInvoices.length}</div>
            </div>
            <div style={{ background: 'var(--panel-primary)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Paid</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{paidCount}</div>
            </div>
            <div style={{ background: 'var(--panel-primary)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{pendingCount}</div>
            </div>
            <div style={{ background: 'var(--panel-primary)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Late</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{lateCount}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
              <p style={{ fontSize: '16px' }}>Loading payment schedule...</p>
            </div>
          ) : error ? (
            <div style={{
              padding: '20px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid var(--error)',
              borderRadius: '8px',
              color: 'var(--error)',
              textAlign: 'center'
            }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
              {error}
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {filteredInvoices.map((invoice, index) => (
                <div 
                  key={invoice.invoice_id}
                  style={{
                    background: 'var(--panel-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${getStatusColor(invoice.status)}22 0%, ${getStatusColor(invoice.status)}44 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      color: getStatusColor(invoice.status)
                    }}>
                      <i className="fas fa-file-invoice"></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {invoice.invoice_number}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        <i className="fas fa-calendar-alt" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                        Due: {new Date(invoice.due_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ${parseFloat(invoice.amount_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: getStatusColor(invoice.status),
                        color: 'white',
                        display: 'inline-block',
                        marginTop: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {invoice.status || 'PENDING'}
                      </div>
                    </div>
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(invoice);
                          setPaymentAmount(invoice.amount_due);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      >
                        <i className="fas fa-dollar-sign" style={{ marginRight: '6px' }}></i>
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
              <p style={{ fontSize: '18px', fontWeight: 500 }}>No upcoming payments</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>No invoices due from today until end of year.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid var(--border)',
          background: 'var(--panel-secondary)',
          borderRadius: '0 0 16px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
            <span style={{ fontWeight: 600 }}>Total Due This Year:</span>
            <span style={{ marginLeft: '12px', fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>
              ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'var(--panel-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--accent-primary)';
              e.target.style.color = 'white';
              e.target.style.borderColor = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--panel-primary)';
              e.target.style.color = 'var(--text-primary)';
              e.target.style.borderColor = 'var(--border)';
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedInvoice && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001
          }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div 
            style={{
              background: 'var(--panel-primary)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                <i className="fas fa-cash-register" style={{ marginRight: '10px', color: 'var(--accent-primary)' }}></i>
                Register Payment
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                {selectedInvoice.invoice_number}
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Payment Amount
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegisterPayment}
                  disabled={isSubmitting || !paymentAmount}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: isSubmitting || !paymentAmount ? 'var(--border)' : 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: isSubmitting || !paymentAmount ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check" style={{ marginRight: '8px' }}></i>
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}