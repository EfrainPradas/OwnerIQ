import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './InvestorPortfolio.css';

const OwnershipStructure = ({ onNavigate }) => {
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const initialFormState = {
        entity_name: '',
        entity_type: 'llc',
        ein: '',
        entity_email: '',
        entity_phone: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const entityTypes = [
        { value: 'personal', label: 'Personal (Direct Ownership)' }, // Usually handled by avoiding entity_id
        { value: 'llc', label: 'LLC (Limited Liability Company)' },
        { value: 'company', label: 'Corporation / Inc.' },
        { value: 'trust', label: 'Trust' },
        { value: 'partnership', label: 'Partnership' }
    ];

    useEffect(() => {
        loadEntities();
    }, []);

    const loadEntities = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const { data, error } = await supabase
                .from('entities')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setEntities(data || []);
        } catch (error) {
            console.error('Error loading entities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const payload = {
                ...formData,
                user_id: user.id
            };

            if (editingId) {
                const { error } = await supabase
                    .from('entities')
                    .update(payload)
                    .eq('entity_id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('entities')
                    .insert([payload]);
                if (error) throw error;
            }

            setEditingId(null);
            setIsAdding(false);
            setFormData(initialFormState);
            loadEntities();
        } catch (error) {
            console.error('Error saving entity:', error);
            alert('Failed to save entity');
        }
    };

    const handleDelete = async (id) => {
        // Check if properties are assigned to this entity first?
        if (!window.confirm('Are you sure you want to delete this entity? Asssociated properties may need to be reassigned.')) return;
        try {
            const { error } = await supabase
                .from('entities')
                .delete()
                .eq('entity_id', id);

            if (error) throw error;
            loadEntities();
        } catch (error) {
            console.error('Error deleting entity:', error);
            alert('Could not delete entity. It might have properties assigned.');
        }
    };

    const startEdit = (entity) => {
        setFormData(entity);
        setEditingId(entity.entity_id);
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

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="investor-portfolio ownership-view">
            <div className="dashboard-header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '10px' }}>
                        ← Back to Portfolio
                    </button>
                    <h2>Ownership Structure</h2>
                    <p className="header-subtitle">Manage legal entities and holding companies</p>
                </div>
                <div className="header-actions">
                    {!isAdding && !editingId && (
                        <button className="btn btn-primary" onClick={startAdd}>
                            <i className="fas fa-plus"></i> Add New Entity
                        </button>
                    )}
                </div>
            </div>

            {(isAdding || editingId) && (
                <div className="section-card edit-form" style={{ maxWidth: '600px', margin: '0 auto 20px auto' }}>
                    <h3>{isAdding ? 'Register New Entity' : 'Edit Entity Details'}</h3>
                    <div className="info-grid single-col">
                        <div className="form-group">
                            <label>Legal Entity Name</label>
                            <input
                                type="text"
                                value={formData.entity_name}
                                onChange={e => setFormData({ ...formData, entity_name: e.target.value })}
                                placeholder="e.g. Smith Holdings LLC"
                            />
                        </div>

                        <div className="form-group">
                            <label>Entity Type</label>
                            <select
                                value={formData.entity_type}
                                onChange={e => setFormData({ ...formData, entity_type: e.target.value })}
                            >
                                {entityTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>EIN (Tax ID)</label>
                            <input
                                type="text"
                                value={formData.ein}
                                onChange={e => setFormData({ ...formData, ein: e.target.value })}
                                placeholder="XX-XXXXXXX"
                            />
                        </div>

                        <div className="form-group">
                            <label>Contact Email (Optional)</label>
                            <input
                                type="email"
                                value={formData.entity_email}
                                onChange={e => setFormData({ ...formData, entity_email: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Contact Phone (Optional)</label>
                            <input
                                type="tel"
                                value={formData.entity_phone}
                                onChange={e => setFormData({ ...formData, entity_phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={cancelEdit}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Entity</button>
                    </div>
                </div>
            )}

            <div className="entities-grid">
                <div className="entity-card personal" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="entity-header">
                        <h4>Personal Holdings</h4>
                        <span className="badge">Default</span>
                    </div>
                    <p className="entity-desc">Properties owned directly in your name.</p>
                </div>

                {entities.map(entity => (
                    <div key={entity.entity_id} className="entity-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                        <div className="entity-header">
                            <h4>{entity.entity_name}</h4>
                            <div className="card-actions">
                                <button className="icon-btn" onClick={() => startEdit(entity)}>
                                    <i className="fas fa-edit"></i>
                                </button>
                                <button className="icon-btn" onClick={() => handleDelete(entity.entity_id)}>
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div className="entity-details">
                            <div className="detail-row">
                                <span className="label">Type:</span>
                                <span className="value">{entity.entity_type?.toUpperCase()}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">EIN:</span>
                                <span className="value">{entity.ein || 'N/A'}</span>
                            </div>
                            {(entity.entity_email || entity.entity_phone) && (
                                <div className="detail-row contact">
                                    <span className="label">Contact:</span>
                                    <span className="value">
                                        {entity.entity_email && <div>{entity.entity_email}</div>}
                                        {entity.entity_phone && <div>{entity.entity_phone}</div>}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OwnershipStructure;
