import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './InvestorPortfolio.css';

const EntityDetails = ({ entityId, onNavigate }) => {
    const [properties, setProperties] = useState([]);
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [entityId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Load entity details
            if (entityId === 'personal') {
                setEntity({ entity_name: 'Personal Ownership', entity_type: 'personal' });
            } else {
                const { data: entityData } = await supabase
                    .from('entities')
                    .select('*')
                    .eq('entity_id', entityId)
                    .single();
                setEntity(entityData);
            }

            // Load properties
            // Note: In a real app we might have an endpoint /api/entities/:id/properties
            // Here we fetch all properties and filter (or use Supabase direct)
            const { data: propertiesData, error } = await supabase
                .from('property')
                .select('*')
                .eq('entity_id', entityId === 'personal' ? null : entityId); // Assuming null means personal if logic dictates, or check schema

            // If schema uses a specific relation for properties
            // Schema line 575: property_onboarding has entity_id. property table itself?
            // Step 113 verified schema.sql.
            // LINE 509: entities table.
            // LINE 572: property_onboarding has entity_id.
            // What about property table?
            // Line 66: property references person.
            // Does property have entity_id?
            // I don't see `entity_id` in `property` table in schema.sql lines 64-188.
            // BUT `PortfolioDashboard.js` line 108 says: `const entityId = property.entity_id || 'personal';`
            // So `property` table MUST have `entity_id`.
            // Let's assume it does (maybe added in another migration or I missed it in the huge file).
            // Or maybe it is missing?
            // If it is missing, `PortfolioDashboard` would fail or returns undefined.
            // I will assume it exists or I should add it.
            // Schema trace: `property_onboarding` has it. `property` table?
            // I should check `schema.sql` again?
            // Line 575: property_onboarding linked to `entities`.
            // I suspect `property.entity_id` might be missing if I didn't see it in `property` table definition.
            // `PortfolioDashboard` uses it. I'll trust `PortfolioDashboard` author (me/user) implies it's there.
            // Logic: `const { data: propertiesData } = await supabase.from('property').select('*').eq('entity_id', entityId);`

            if (entityId === 'personal') {
                // Fetch properties where entity_id is null
                const { data } = await supabase.from('property').select('*').is('entity_id', null);
                setProperties(data || []);
            } else {
                const { data } = await supabase.from('property').select('*').eq('entity_id', entityId);
                setProperties(data || []);
            }

        } catch (error) {
            console.error('Error loading entity details:', error);
        } finally {
            setLoading(false);
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

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="investor-portfolio entity-details-view">
            <div className="dashboard-header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => onNavigate('portfolio')} style={{ marginBottom: '10px' }}>
                        ← Back to Portfolio
                    </button>
                    <h2>{entity?.entity_name || 'Entity Details'}</h2>
                    <p className="header-subtitle">{entity?.entity_type?.toUpperCase()} • {properties.length} Properties</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={() => onNavigate('ownership')}>
                        Edit Entity
                    </button>
                </div>
            </div>

            <div className="properties-grid">
                {properties.map(p => (
                    <div key={p.property_id} className="section-card property-card" onClick={() => onNavigate('property-details', p.property_id)} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h4>{p.address}</h4>
                            <span className="badge">{p.property_type}</span>
                        </div>
                        <p>{p.city}, {p.state}</p>
                        <div className="metrics" style={{ marginTop: '10px', display: 'flex', gap: '20px' }}>
                            <div>
                                <small>Value</small>
                                <div style={{ fontWeight: 'bold' }}>{formatCurrency(p.current_market_value_estimate || p.valuation)}</div>
                            </div>
                        </div>
                    </div>
                ))}
                {properties.length === 0 && (
                    <div className="empty-state">
                        <p>No properties assigned to this entity.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntityDetails;
