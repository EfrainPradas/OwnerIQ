import React, { useState, useEffect } from 'react';
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
            const response = await fetch(`http://localhost:5001/api/events/${userId}`);
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
        return { in_progress: '#8b5cf6', completed: '#10b981', error: '#ef4444', warning: '#f59e0b' }[status] || '#8b5cf6';
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><p>Cargando logs...</p></div>;
    if (!selectedUserId) return <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><h3>👈 Selecciona un usuario para ver sus logs</h3></div>;

    return (
        <div style={{ padding: '40px', maxWidth: '600px' }}>
            {logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><p>No hay logs de onboarding</p></div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {logs.map((log, index) => (
                        <div key={log.event_id || index} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: index < logs.length - 1 ? '40px' : '0' }}>
                            {/* Left side - Count/Icon */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: getStatusColor(log.status),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                                    position: 'relative',
                                    zIndex: 2
                                }}>
                                    {getEventIcon(log.event_type)}
                                </div>
                                {index < logs.length - 1 && (
                                    <div style={{
                                        width: '3px',
                                        flex: 1,
                                        background: 'linear-gradient(to bottom, #8b5cf6, #ec4899)',
                                        minHeight: '40px',
                                        position: 'absolute',
                                        top: '40px',
                                        left: '18.5px'
                                    }} />
                                )}
                            </div>

                            {/* Right side - Event info */}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    cursor: log.metadata && Object.keys(log.metadata).length > 0 ? 'pointer' : 'default'
                                }}
                                    onClick={() => log.metadata && Object.keys(log.metadata).length > 0 && toggleMetadata(log.event_id)}
                                >
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937', marginBottom: '4px' }}>
                                        {log.event_type.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                        {log.event_category && <span style={{ marginLeft: '8px', color: '#8b5cf6' }}>• {log.event_category}</span>}
                                    </div>
                                </div>

                                {expandedLogs[log.event_id] && log.metadata && (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '12px',
                                        background: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        color: '#374151'
                                    }}>
                                        {Object.entries(log.metadata).map(([key, value]) => (
                                            <div key={key} style={{ marginBottom: '4px' }}>
                                                <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </div>
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
