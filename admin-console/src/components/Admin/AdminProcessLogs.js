import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminProcessLogs = ({ selectedBatchId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogs, setExpandedLogs] = useState({});

    useEffect(() => {
        if (selectedBatchId) {
            loadLogs(selectedBatchId);
        }
    }, [selectedBatchId]);

    const loadLogs = async (batchId) => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5001/api/admin/process-logs/${batchId}`);
            const data = await response.json();
            if (data.success) {
                setLogs(data.events || []);
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMetadata = (eventId) => {
        setExpandedLogs(prev => ({ ...prev, [eventId]: !prev[eventId] }));
    };

    const getEventIcon = (eventType) => {
        const icons = {
            'BATCH_PROCESSING_STARTED': '🚀', 'DOCUMENT_PROCESSED': '📄',
            'DOCUMENT_PROCESSING_FAILED': '❌', 'DATA_CONSOLIDATION_STARTED': '🔗',
            'DATA_CONSOLIDATED': '✅', 'PROPERTY_CREATED': '🏠',
            'BATCH_STATUS_UPDATED': '📌', 'BATCH_PROCESSING_COMPLETED': '🎉',
            'BATCH_PROCESSING_FAILED': '💥'
        };
        return icons[eventType] || '📝';
    };

    const getStatusColor = (status) => {
        return { info: '#8b5cf6', success: '#10b981', warning: '#f59e0b', error: '#ef4444' }[status] || '#8b5cf6';
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><p>Cargando logs...</p></div>;
    if (!selectedBatchId) return <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><h3>👈 Selecciona un batch para ver sus logs</h3></div>;

    return (
        <div style={{ padding: '40px', maxWidth: '600px' }}>
            {logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}><p>No hay logs para este batch</p></div>
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
                                    cursor: log.event_data && Object.keys(log.event_data).length > 0 ? 'pointer' : 'default'
                                }}
                                    onClick={() => log.event_data && Object.keys(log.event_data).length > 0 && toggleMetadata(log.event_id)}
                                >
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937', marginBottom: '4px' }}>
                                        {log.event_type.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </div>
                                </div>

                                {expandedLogs[log.event_id] && log.event_data && (
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
                                        {Object.entries(log.event_data).map(([key, value]) => (
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

export default AdminProcessLogs;
