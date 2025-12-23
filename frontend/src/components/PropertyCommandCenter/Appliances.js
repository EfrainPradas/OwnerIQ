import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PropertyCommandCenter.css';

const Appliances = ({ propertyId, onNavigate }) => {
    const [appliances, setAppliances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [filter, setFilter] = useState('');

    const initialFormState = {
        appliance_type: 'refrigerator',
        brand: '',
        model: '',
        serial_number: '',
        sku: '',
        purchase_date: '',
        warranty_expiration_date: '',
        price: '',
        quantity: 1,
        condition: 'good',
        installation_notes: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const applianceTypes = [
        { value: 'refrigerator', label: 'Refrigerator' },
        { value: 'dishwasher', label: 'Dishwasher' },
        { value: 'oven', label: 'Oven / Range' },
        { value: 'microwave', label: 'Microwave' },
        { value: 'washer', label: 'Washer' },
        { value: 'dryer', label: 'Dryer' },
        { value: 'hvac', label: 'HVAC' },
        { value: 'water_heater', label: 'Water Heater' },
        { value: 'garage_door', label: 'Garage Door' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        loadData();
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('property_appliances')
                .select('*')
                .eq('property_id', propertyId)
                .order('appliance_type');

            if (error) throw error;
            setAppliances(data || []);
        } catch (error) {
            console.error('Error loading appliances:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                property_id: propertyId
            };

            if (editingId) {
                const { error } = await supabase
                    .from('property_appliances')
                    .update(payload)
                    .eq('appliance_id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('property_appliances')
                    .insert([payload]);
                if (error) throw error;
            }

            setEditingId(null);
            setIsAdding(false);
            setFormData(initialFormState);
            loadData();
        } catch (error) {
            console.error('Error saving appliance:', error);
            alert('Failed to save appliance');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this appliance?')) return;
        try {
            const { error } = await supabase
                .from('property_appliances')
                .delete()
                .eq('appliance_id', id);

            if (error) throw error;
            loadData();
        } catch (error) {
            console.error('Error deleting appliance:', error);
        }
    };

    const startEdit = (item) => {
        setFormData(item);
        setEditingId(item.appliance_id);
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

    const filteredAppliances = appliances.filter(app =>
        app.brand?.toLowerCase().includes(filter.toLowerCase()) ||
        app.model?.toLowerCase().includes(filter.toLowerCase()) ||
        app.appliance_type?.toLowerCase().includes(filter.toLowerCase())
    );

    const getWarrantyStatus = (date) => {
        if (!date) return null;
        const today = new Date();
        const expiry = new Date(date);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'expired', label: 'Expired', color: 'var(--error)' };
        if (diffDays <= 30) return { status: 'expiring', label: `Expires in ${diffDays} days`, color: 'var(--warning)' };
        return { status: 'active', label: 'Active', color: 'var(--success)' };
    };

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="property-command-center appliances-view">
            <div className="details-header">
                <div className="header-title">
                    <button className="back-btn" onClick={() => onNavigate('overview')}>
                        ← Back to Overview
                    </button>
                    <h2>Appliances</h2>
                    <p className="header-subtitle">Inventory and warranty tracking</p>
                </div>
                <div className="header-actions">
                    {!isAdding && !editingId && (
                        <button className="btn btn-primary" onClick={startAdd}>
                            <i className="fas fa-plus"></i> Add Appliance
                        </button>
                    )}
                </div>
            </div>

            {!isAdding && !editingId && (
                <div className="filter-bar" style={{ marginBottom: '20px' }}>
                    <input
                        type="text"
                        placeholder="Search by brand, model or type..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--panel-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>
            )}

            {(isAdding || editingId) && (
                <div className="section-card edit-form">
                    <h3>{isAdding ? 'Add Appliance' : 'Edit Appliance'}</h3>
                    <div className="info-grid">
                        <div className="form-group">
                            <label>Type</label>
                            <select
                                value={formData.appliance_type}
                                onChange={e => setFormData({ ...formData, appliance_type: e.target.value })}
                            >
                                {applianceTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Brand</label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Model</label>
                            <input
                                type="text"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Serial Number</label>
                            <input
                                type="text"
                                value={formData.serial_number}
                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Purchase Date</label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Warranty Expiration</label>
                            <input
                                type="date"
                                value={formData.warranty_expiration_date}
                                onChange={e => setFormData({ ...formData, warranty_expiration_date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Price</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Condition</label>
                            <select
                                value={formData.condition}
                                onChange={e => setFormData({ ...formData, condition: e.target.value })}
                            >
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="fair">Fair</option>
                                <option value="poor">Poor</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Notes</label>
                            <textarea
                                value={formData.installation_notes}
                                onChange={e => setFormData({ ...formData, installation_notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={cancelEdit}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Appliance</button>
                    </div>
                </div>
            )}

            <div className="appliances-list">
                {filteredAppliances.map(app => {
                    const warranty = getWarrantyStatus(app.warranty_expiration_date);
                    return (
                        <div key={app.appliance_id} className="section-card appliance-card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        padding: '8px', borderRadius: '6px', background: 'var(--panel-primary)',
                                        fontSize: '20px', color: 'var(--accent-primary)'
                                    }}>
                                        <i className="fas fa-plug"></i>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0 }}>{applianceTypes.find(t => t.value === app.appliance_type)?.label || app.appliance_type}</h4>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.brand} {app.model}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="icon-btn" onClick={() => startEdit(app)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button className="icon-btn" onClick={() => handleDelete(app.appliance_id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="info-grid compact" style={{ fontSize: '13px' }}>
                                <div className="info-item">
                                    <label>Serial #</label>
                                    <span>{app.serial_number || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Age</label>
                                    <span>{app.purchase_date ? new Date().getFullYear() - new Date(app.purchase_date).getFullYear() + ' years' : 'unknown'}</span>
                                </div>
                                {warranty && (
                                    <div className="info-item">
                                        <label>Warranty</label>
                                        <span style={{ color: warranty.color, fontWeight: 'bold' }}>{warranty.label}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {!loading && filteredAppliances.length === 0 && !isAdding && (
                    <div style={{ textAlign: 'center', padding: '40px', background: 'var(--panel-secondary)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                        No appliances found matching your filter.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Appliances;
