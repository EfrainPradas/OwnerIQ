import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import './AdminDashboard.css';

const OnboardingEventLogs = ({ selectedUserId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogs, setExpandedLogs] = useState({});

    useEffect(() => {
        if (selectedUserId) {
            loadLogs(selectedUserId);
        }
    }, [selectedUserId]);

    const loadLogs = async (userId) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/events/${userId}`);
            const data = await response.json();
            if (data.success) {
                setLogs(data.events || []);
            }
        } catch (error) {
            console.error('Error loading onboarding logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMetadata = (eventId) => {
        setExpandedLogs(prev => ({ ...prev, [eventId]: !prev[eventId] }));
    };

    const getEventIcon = (eventType) => {
        const icons = {
            'profile_created': '👤', 'profile_updated': '✏️',
            'step_started': '▶️', 'step_completed': '✅',
            'document_uploaded': '📄', 'validation_error': '⚠️',
            'onboarding_completed': '🎉', 'error': '❌'
        };
        return icons[eventType] || '📝';
    };

    const getStatusColor = (status) => {
        return { in_progress: '#58a6ff', completed: '#3fb950', error: '#f85149', warning: '#d29922' }[status] || '#8b949e';
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><p>Cargando logs...</p></div>;
    if (!selectedUserId) return <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><h3>👈 Selecciona un usuario para ver sus logs</h3></div>;

    return (
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>📊 Event Timeline</h3>
            {logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}><p>No hay logs de onboarding para este usuario</p></div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {logs.map((log, index) => (
                        <div key={log.event_id || index} style={{ position: 'relative', paddingLeft: '60px', paddingBottom: '30px' }}>
                            {index < logs.length - 1 && (
                                <div style={{ position: 'absolute', left: '24px', top: '40px', bottom: '-30px', width: '2px', background: '#999' }} />
                            )}
                            <div style={{ position: 'absolute', left: '0', top: '0', width: '48px', height: '48px', borderRadius: '50%', background: getStatusColor(log.status), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                {getEventIcon(log.event_type)}
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
                                            {log.event_type.replace(/_/g, ' ')}
                                        </span>
                                        {log.event_category && (
                                            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: 'rgba(255, 255, 255, 0.15)', color: '#ddd' }}>
                                                {log.event_category}
                                            </span>
                                        )}
                                        <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: getStatusColor(log.status) + '20', color: getStatusColor(log.status) }}>
                                            {log.status}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#ddd' }}>
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <button onClick={() => toggleMetadata(log.event_id)} style={{ color: '#a8c5ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                                        ▶ View Metadata
                                    </button>
                                )}
                                {expandedLogs[log.event_id] && (
                                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', color: '#ddd' }}>
                                        {Object.entries(log.metadata).map(([key, value]) => (
                                            <div key={key}><strong style={{ color: '#fff' }}>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OnboardingEventLogs;
