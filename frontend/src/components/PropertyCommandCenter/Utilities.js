import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PropertyCommandCenter.css';

const Utilities = ({ propertyId, onNavigate }) => {
    const [utilities, setUtilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // Empty form state
    const initialFormState = {
        utility_type: 'electric',
        company_name: '',
        account_number: '',
        meter_number: '',
        customer_portal_url: '',
        monthly_average_cost: '',
        is_active: true
    };
    const [formData, setFormData] = useState(initialFormState);

    const utilityTypes = [
        { value: 'electric', label: 'Electric / Power' },
        { value: 'water', label: 'Water' },
        { value: 'gas', label: 'Gas' },
        { value: 'internet', label: 'Internet / Cable' },
        { value: 'trash', label: 'Trash / Recycling' },
        { value: 'sewer', label: 'Sewer' }
    ];

    useEffect(() => {
        loadData();
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Assuming endpoint exists or using Supabase direct query if backend routes aren't set up yet
            // For now, let's try direct Supabase query as fallback if API fails or to be robust
            const { data, error } = await supabase
                .from('property_utilities')
                .select('*')
                .eq('property_id', propertyId)
                .order('utility_type');

            if (error) throw error;
            setUtilities(data || []);
        } catch (error) {
            console.error('Error loading utilities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            const payload = {
                ...formData,
                property_id: propertyId
            };

            let result;
            if (editingId) {
                // Update
                const { data, error } = await supabase
                    .from('property_utilities')
                    .update(payload)
                    .eq('utility_id', editingId)
                    .select();

                if (error) throw error;
                result = data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('property_utilities')
                    .insert([payload])
                    .select();

                if (error) throw error;
                result = data;
            }

            setEditingId(null);
            setIsAdding(false);
            setFormData(initialFormState);
            loadData();
        } catch (error) {
            console.error('Error saving utility:', error);
            alert('Failed to save utility');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this utility?')) return;
        try {
            const { error } = await supabase
                .from('property_utilities')
                .delete()
                .eq('utility_id', id);

            if (error) throw error;
            loadData();
        } catch (error) {
            console.error('Error deleting utility:', error);
        }
    };

    const startEdit = (utility) => {
        setFormData(utility);
        setEditingId(utility.utility_id);
        setIsAdding(false);
    };

    const startAdd = () => {
        setFormData(initialFormState);
        setEditingId(null);
        setIsAdding(true);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData(initialFormState);
    };

    const getUtilityIcon = (type) => {
        switch (type) {
            case 'electric': return 'fa-bolt';
            case 'water': return 'fa-tint';
            case 'gas': return 'fa-burn';
            case 'internet': return 'fa-wifi';
            case 'trash': return 'fa-trash-alt';
            case 'sewer': return 'fa-toilet';
            default: return 'fa-tools';
        }
    };

    const getUtilityColor = (type) => {
        switch (type) {
            case 'electric': return '#F59E0B'; // Amber
            case 'water': return '#3B82F6'; // Blue
            case 'gas': return '#EF4444'; // Red
            case 'internet': return '#8B5CF6'; // Purple
            default: return '#6B7280'; // Gray
        }
    };

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="property-command-center utilities-view">
            <div className="details-header">
                <div className="header-title">
                    <button className="back-btn" onClick={() => onNavigate('overview')}>
                        ← Back to Overview
                    </button>
                    <h2>Utilities</h2>
                    <p className="header-subtitle">Manage service providers and accounts</p>
                </div>
                <div className="header-actions">
                    {!isAdding && !editingId && (
                        <button className="btn btn-primary" onClick={startAdd}>
                            <i className="fas fa-plus"></i> Add Utility
                        </button>
                    )}
                </div>
            </div>

            {(isAdding || editingId) && (
                <div className="section-card edit-form">
                    <h3>{isAdding ? 'Add New Utility' : 'Edit Utility'}</h3>
                    <div className="info-grid">
                        <div className="form-group">
                            <label>Service Type</label>
                            <select
                                value={formData.utility_type}
                                onChange={e => setFormData({ ...formData, utility_type: e.target.value })}
                            >
                                {utilityTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Company Name</label>
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                placeholder="e.g. PG&E"
                            />
                        </div>

                        <div className="form-group">
                            <label>Account Number</label>
                            <input
                                type="text"
                                value={formData.account_number}
                                onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Meter Number</label>
                            <input
                                type="text"
                                value={formData.meter_number}
                                onChange={e => setFormData({ ...formData, meter_number: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Monthly Avg Cost ($)</label>
                            <input
                                type="number"
                                value={formData.monthly_average_cost}
                                onChange={e => setFormData({ ...formData, monthly_average_cost: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Portal URL</label>
                            <input
                                type="text"
                                value={formData.customer_portal_url}
                                onChange={e => setFormData({ ...formData, customer_portal_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={cancelEdit}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Utility</button>
                    </div>
                </div>
            )}

            <div className="utilities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {utilities.map(util => (
                    <div key={util.utility_id} className="section-card utility-card" style={{ borderTop: `4px solid ${getUtilityColor(util.utility_type)}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: `${getUtilityColor(util.utility_type)}20`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: getUtilityColor(util.utility_type)
                                }}>
                                    <i className={`fas ${getUtilityIcon(util.utility_type)}`}></i>
                                </div>
                                <div>
                                    <h4 style={{ margin: 0 }}>{utilityTypes.find(t => t.value === util.utility_type)?.label || util.utility_type}</h4>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{util.company_name}</div>
                                </div>
                            </div>
                            <div className="card-actions">
                                <button className="icon-btn" onClick={() => startEdit(util)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <i className="fas fa-edit"></i>
                                </button>
                                <button className="icon-btn" onClick={() => handleDelete(util.utility_id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>

                        <div className="info-grid compact">
                            <div className="info-item">
                                <label>Account #</label>
                                <span>{util.account_number || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <label>Avg Cost</label>
                                <span>${util.monthly_average_cost || '0'}</span>
                            </div>
                            {util.meter_number && (
                                <div className="info-item">
                                    <label>Meter #</label>
                                    <span>{util.meter_number}</span>
                                </div>
                            )}
                        </div>

                        {util.customer_portal_url && (
                            <a href={util.customer_portal_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '15px', fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                                <i className="fas fa-external-link-alt"></i> Visit Portal
                            </a>
                        )}
                    </div>
                ))}

                {!loading && utilities.length === 0 && !isAdding && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--panel-secondary)', borderRadius: '8px' }}>
                        <p>No utilities added yet.</p>
                        <button className="btn btn-outline" onClick={startAdd}>Add First Utility</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Utilities;
