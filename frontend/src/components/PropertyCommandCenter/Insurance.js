import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PropertyCommandCenter.css';

const Insurance = ({ propertyId, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        insurance_company: '',
        insurance_agency: '', // mapped to valid DB field if exists, otherwise assume generic or notes
        policy_number: '',
        annual_premium: '', // insurance_initial_premium
        start_date: '', // hoi_effective_date
        expiration_date: '', // hoi_expiration_date
        coverage_a_dwelling: '',
        coverage_b_other_structures: '',
        coverage_c_personal_property: '',
        agent_name: '',
        agent_phone: '',
        agent_email: ''
    });

    useEffect(() => {
        loadData();
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
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
                    insurance_company: data.insurance_company || '',
                    insurance_agency: '', // No specific field in schema, defaulting empty or could use notes
                    policy_number: data.insurance_policy_number || '',
                    annual_premium: data.insurance_initial_premium || '',
                    start_date: data.hoi_effective_date || '',
                    expiration_date: data.hoi_expiration_date || '',
                    coverage_a_dwelling: data.coverage_a_dwelling || '',
                    coverage_b_other_structures: data.coverage_b_other_structures || data.coverage_b_structures || '',
                    coverage_c_personal_property: data.coverage_c_personal_property || data.coverage_c_property || '',
                    agent_name: data.agent_name || data.insurance_agent_name || '',
                    agent_phone: data.agent_phone || data.insurance_agent_phone_number || '',
                    agent_email: data.agent_email || data.insurance_agent_email_address || ''
                });
            }
        } catch (error) {
            console.error('Error loading insurance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Map back to DB fields
            const dbPayload = {
                insurance_company: formData.insurance_company,
                insurance_policy_number: formData.policy_number,
                insurance_initial_premium: formData.annual_premium,
                hoi_effective_date: formData.start_date,
                hoi_expiration_date: formData.expiration_date,
                coverage_a_dwelling: formData.coverage_a_dwelling,
                coverage_b_structures: formData.coverage_b_other_structures,
                coverage_c_property: formData.coverage_c_personal_property,
                agent_name: formData.agent_name,
                agent_phone: formData.agent_phone,
                agent_email: formData.agent_email
            };

            const response = await fetch(`/api/properties/${propertyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dbPayload)
            });

            if (response.ok) {
                setEditing(false);
                loadData();
            }
        } catch (error) {
            console.error('Error saving insurance data:', error);
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

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString('en-US');
    };

    const getDaysUntilExpiration = () => {
        if (!formData.expiration_date) return null;
        const today = new Date();
        const exp = new Date(formData.expiration_date);
        const diffTime = exp - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilExp = getDaysUntilExpiration();
    const isExpiringSoon = daysUntilExp !== null && daysUntilExp <= 30 && daysUntilExp >= 0;
    const isExpired = daysUntilExp !== null && daysUntilExp < 0;

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="property-command-center insurance-view">
            <div className="details-header">
                <div className="header-title">
                    <button className="back-btn" onClick={() => onNavigate('overview')}>
                        ← Back to Overview
                    </button>
                    <h2>Insurance Policies</h2>
                    <p className="header-subtitle">Coverage details and agent contact</p>
                </div>
                <div className="header-actions">
                    {!editing ? (
                        <button className="btn btn-primary" onClick={() => setEditing(true)}>
                            Edit Policy
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

            {isExpiringSoon && (
                <div className="alert alert-warning" style={{ marginBottom: '20px', padding: '15px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                        <strong>Policy Expiring Soon!</strong>
                        <p style={{ margin: 0 }}>Your insurance policy expires in {daysUntilExp} days ({formatDate(formData.expiration_date)}).</p>
                    </div>
                </div>
            )}

            {isExpired && (
                <div className="alert alert-error" style={{ marginBottom: '20px', padding: '15px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-times-circle"></i>
                    <div>
                        <strong>Policy Expired!</strong>
                        <p style={{ margin: 0 }}>Your insurance policy expired on {formatDate(formData.expiration_date)}.</p>
                    </div>
                </div>
            )}

            <div className="section-card">
                <h3>Policy Information</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Insurance Company</label>
                        {editing ? (
                            <input
                                type="text"
                                value={formData.insurance_company}
                                onChange={e => setFormData({ ...formData, insurance_company: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formData.insurance_company || 'Not specified'}</span>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Policy Number</label>
                        {editing ? (
                            <input
                                type="text"
                                value={formData.policy_number}
                                onChange={e => setFormData({ ...formData, policy_number: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formData.policy_number || 'Not specified'}</span>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Annual Premium</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.annual_premium}
                                onChange={e => setFormData({ ...formData, annual_premium: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formatCurrency(formData.annual_premium)}</span>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Expiration Date</label>
                        {editing ? (
                            <input
                                type="date"
                                value={formData.expiration_date}
                                onChange={e => setFormData({ ...formData, expiration_date: e.target.value })}
                            />
                        ) : (
                            <span className={`info-value ${isExpiringSoon || isExpired ? 'text-error' : ''}`}>
                                {formatDate(formData.expiration_date)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="section-card">
                <h3>Coverage Details</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Coverage A - Dwelling</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.coverage_a_dwelling}
                                onChange={e => setFormData({ ...formData, coverage_a_dwelling: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formatCurrency(formData.coverage_a_dwelling)}</span>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Coverage B - Other Structures</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.coverage_b_other_structures}
                                onChange={e => setFormData({ ...formData, coverage_b_other_structures: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formatCurrency(formData.coverage_b_other_structures)}</span>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Coverage C - Personal Property</label>
                        {editing ? (
                            <input
                                type="number"
                                value={formData.coverage_c_personal_property}
                                onChange={e => setFormData({ ...formData, coverage_c_personal_property: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formatCurrency(formData.coverage_c_personal_property)}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="section-card">
                <h3>Agent Contact</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Agent Name</label>
                        {editing ? (
                            <input
                                type="text"
                                value={formData.agent_name}
                                onChange={e => setFormData({ ...formData, agent_name: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formData.agent_name || 'Not specified'}</span>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Agent Phone</label>
                        {editing ? (
                            <input
                                type="tel"
                                value={formData.agent_phone}
                                onChange={e => setFormData({ ...formData, agent_phone: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formData.agent_phone || 'Not specified'}</span>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Agent Email</label>
                        {editing ? (
                            <input
                                type="email"
                                value={formData.agent_email}
                                onChange={e => setFormData({ ...formData, agent_email: e.target.value })}
                            />
                        ) : (
                            <span className="info-value">{formData.agent_email || 'Not specified'}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Insurance;
