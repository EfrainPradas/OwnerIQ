import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PropertyCommandCenter.css';

const Taxes = ({ propertyId, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        legal_description: '',
        county: '',
        tax_authority: '',
        account_number: '',
        assessed_value: '',
        taxable_value: '',
        tax_rate_percent: '',
        taxes_paid_last_year: '',
        annual_tax_amount: ''
    });

    useEffect(() => {
        loadData();
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/properties/${propertyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setFormData({
                    legal_description: data.legal_description || data.property_address_legal_description || '',
                    county: data.county || data.property_tax_county || '',
                    tax_authority: data.tax_authority || '',
                    account_number: data.account_number || '', // Tax account number
                    assessed_value: data.assessed_value || '',
                    taxable_value: data.taxable_value || '',
                    tax_rate_percent: data.tax_rate_percent || data.property_tax_percentage || '',
                    taxes_paid_last_year: data.taxes_paid_last_year || data.taxes_paid_ytd || '',
                    annual_tax_amount: data.annual_tax_amount || data.year_1 || '' // Fallback to year_1 if latest
                });
            }
        } catch (error) {
            console.error('Error loading tax data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/properties/${propertyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setEditing(false);
                loadData();
            }
        } catch (error) {
            console.error('Error saving tax data:', error);
        }
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
        if (!value || isNaN(value)) return '0.00%';
        return `${parseFloat(value).toFixed(2)}%`;
    };

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="property-command-center taxes-view">
            <div className="details-header">
                <div className="header-title">
                    <button className="back-btn" onClick={() => onNavigate('overview')}>
                        ← Back to Overview
                    </button>
                    <h2>Tax Information</h2>
                    <p className="header-subtitle">Property tax assessment and payment details</p>
                </div>
                <div className="header-actions">
                    {!editing ? (
                        <button className="btn btn-primary" onClick={() => setEditing(true)}>
                            Edit Details
                        </button>
                    ) : (
                        <div className="edit-actions">
                            <button className="btn btn-outline" onClick={() => { setEditing(false); loadData(); }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <h3>Assessment Details</h3>
                    <div className="form-group">
                        <label>Legal Description</label>
                        {editing ? (
                            <textarea
                                value={formData.legal_description}
                                onChange={e => setFormData({ ...formData, legal_description: e.target.value })}
                                rows={3}
                            />
                        ) : (
                            <p className="text-value">{formData.legal_description || 'Not specified'}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>County</label>
                        {editing ? (
                            <input
                                type="text"
                                value={formData.county}
                                onChange={e => setFormData({ ...formData, county: e.target.value })}
                            />
                        ) : (
                            <p className="text-value">{formData.county || 'Not specified'}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Tax Authority</label>
                        {editing ? (
                            <input
                                type="text"
                                value={formData.tax_authority}
                                onChange={e => setFormData({ ...formData, tax_authority: e.target.value })}
                            />
                        ) : (
                            <p className="text-value">{formData.tax_authority || 'Not specified'}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Account / Parcel Number</label>
                        {editing ? (
                            <input
                                type="text"
                                value={formData.account_number}
                                onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                            />
                        ) : (
                            <p className="text-value">{formData.account_number || 'Not specified'}</p>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3>Valuation & Rates</h3>
                    <div className="form-group">
                        <label>Assessed Value</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.assessed_value}
                                onChange={e => setFormData({ ...formData, assessed_value: e.target.value })}
                            />
                        ) : (
                            <p className="text-value">{formatCurrency(formData.assessed_value)}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Taxable Value</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.taxable_value}
                                onChange={e => setFormData({ ...formData, taxable_value: e.target.value })}
                            />
                        ) : (
                            <p className="text-value">{formatCurrency(formData.taxable_value)}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Tax Rate</label>
                        {editing ? (
                            <div className="input-suffix">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.tax_rate_percent}
                                    onChange={e => setFormData({ ...formData, tax_rate_percent: e.target.value })}
                                />
                                <span>%</span>
                            </div>
                        ) : (
                            <p className="text-value">{formatPercent(formData.tax_rate_percent)}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Annual Tax Amount</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.annual_tax_amount}
                                onChange={e => setFormData({ ...formData, annual_tax_amount: e.target.value })}
                            />
                        ) : (
                            <p className="text-value">{formatCurrency(formData.annual_tax_amount)}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Taxes Paid (Last Year)</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.taxes_paid_last_year}
                                onChange={e => setFormData({ ...formData, taxes_paid_last_year: e.target.value })}
                            />
                        ) : (
                            <p className="text-value">{formatCurrency(formData.taxes_paid_last_year)}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Taxes;
