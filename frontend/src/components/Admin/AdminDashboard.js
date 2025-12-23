import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './AdminDashboard.css';
import { MatrixBinaryRain } from './MatrixBinaryRain';
import AdminProcessLogs from './AdminProcessLogs';
import OnboardingEventLogs from './OnboardingEventLogs';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [batches, setBatches] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({});
    const [expandedDoc, setExpandedDoc] = useState(null);
    const [extractedDataMap, setExtractedDataMap] = useState({});
    const [savingToTables, setSavingToTables] = useState({});
    const [statusFilter, setStatusFilter] = useState('ALL'); // Filtro por status

    // Bulk processing states
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, stage: '' });
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [activeTab, setActiveTab] = useState('batches'); // 'batches' or 'logs'
    const [selectedBatchForLogs, setSelectedBatchForLogs] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            loadUserBatches(selectedUser.id);
        }
    }, [selectedUser]);

    // Auto-select first batch for Process Logs
    useEffect(() => {
        if (activeTab === 'logs' && batches.length > 0 && !selectedBatchForLogs) {
            setSelectedBatchForLogs(batches[0].batch_id);
        }
    }, [activeTab, batches, selectedBatchForLogs]);

    const loadUsers = async () => {
        try {
            setLoading(true);

            const { data: profiles, error } = await supabase
                .from('user_profiles')
                .select('user_id, owner_name, owner_email, onboarding_status, current_step, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setUsers(profiles || []);
            setLoading(false);
        } catch (error) {
            console.error('Error loading users:', error);
            setLoading(false);
        }
    };

    const loadUserBatches = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('import_batches')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setBatches(data || []);

            if (data && data.length > 0) {
                const batchIds = data.map(b => b.batch_id);
                await loadDocuments(batchIds);
            } else {
                setDocuments([]);
            }
        } catch (error) {
            console.error('Error loading batches:', error);
            setBatches([]);
            setDocuments([]);
        }
    };

    const loadDocuments = async (batchIds) => {
        try {
            const { data, error } = await supabase
                .from('document_uploads')
                .select('*')
                .in('batch_id', batchIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setDocuments(data || []);
        } catch (error) {
            console.error('Error loading documents:', error);
            setDocuments([]);
        }
    };

    const processDocumentWithAI = async (documentId) => {
        setProcessing(prev => ({ ...prev, [documentId]: true }));

        try {
            const response = await fetch('http://localhost:5001/api/admin/process-document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ document_id: documentId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process document');
            }

            // Save extracted data
            setExtractedDataMap(prev => ({
                ...prev,
                [documentId]: {
                    data: data.extracted_data,
                    document_type: data.document_type,
                    confidence: data.confidence,
                    affected_tables: getAffectedTables(data.document_type, data.extracted_data)
                }
            }));

            // Expand this document to show results
            setExpandedDoc(documentId);

            // Reload documents to show updated status
            if (selectedUser) {
                loadUserBatches(selectedUser.id);
            }
        } catch (error) {
            console.error('Error processing document:', error);
            alert('Error: ' + error.message);
        } finally {
            setProcessing(prev => ({ ...prev, [documentId]: false }));
        }
    };

    // Save extracted data to database tables
    const saveToTables = async (documentId) => {
        const extractedInfo = extractedDataMap[documentId];
        if (!extractedInfo) {
            alert('No extracted data found for this document');
            return;
        }

        try {
            setSavingToTables(prev => ({ ...prev, [documentId]: true }));

            const response = await fetch('http://localhost:5001/api/admin/save-to-tables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    document_id: documentId,
                    extracted_data: extractedInfo.data,
                    document_type: extractedInfo.document_type
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save data');
            }

            alert(`✅ Datos guardados!\n\nPropiedades: ${data.results.properties ? '✓' : '-'}\nHipotecas: ${data.results.mortgages ? '✓' : '-'}\nSeguros: ${data.results.insurance ? '✓' : '-'}\nImpuestos: ${data.results.taxes ? '✓' : '-'}`);

        } catch (error) {
            console.error('Error saving to tables:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setSavingToTables(prev => ({ ...prev, [documentId]: false }));
        }
    };

    // Process all documents in a batch automatically
    const processAllDocumentsAuto = async (batch_id) => {
        if (!window.confirm('¿Procesar TODOS los documentos de este batch automáticamente?')) {
            return;
        }

        try {
            setBulkProcessing(true);

            const response = await fetch('http://localhost:5001/api/admin/process-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ batch_id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process documents');
            }

            // Success message
            const success = data.results.filter(r => r.success).length;
            const total = data.results.length;

            alert(`✅ ¡Procesamiento completado!\n\n${success}/${total} documentos procesados y guardados en las tablas.`);

            // Reload data
            if (selectedUser) {
                loadUserBatches(selectedUser.id);
            }

        } catch (error) {
            console.error('Error in bulk processing:', error);
            alert(`❌ Error: ${error.message}`);
        } finally {
            setBulkProcessing(false);
        }
    };

    // Helper to determine affected tables based on document type
    const getAffectedTables = (docType, extractedData) => {
        const tables = [];

        if (!extractedData) return tables;

        switch (docType) {
            case 'closing':
            case 'closing_disclosure':
                tables.push({ name: 'properties', fields: ['address', 'valuation', 'purchase_date'] });
                tables.push({ name: 'mortgages', fields: ['loan_amount', 'interest_rate', 'lender_name'] });
                break;
            case 'mortgage_statement':
                tables.push({ name: 'mortgages', fields: ['current_balance', 'monthly_payment', 'escrow_balance'] });
                break;
            case 'tax_bill':
                tables.push({ name: 'property_taxes', fields: ['tax_amount', 'tax_year', 'due_date'] });
                break;
            case 'insurance':
                tables.push({ name: 'insurance_policies', fields: ['premium', 'coverage_amount', 'provider'] });
                break;
            case 'lease':
                tables.push({ name: 'leases', fields: ['monthly_rent', 'lease_start', 'lease_end', 'tenant_name'] });
                break;
            case 'invoice':
                tables.push({ name: 'expenses', fields: ['amount', 'category', 'date', 'vendor'] });
                break;
            default:
                tables.push({ name: 'document_uploads', fields: ['extracted_data'] });
        }

        return tables;
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>Loading users...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-container">
            <div className="admin-sidebar">
                <h2>📋 Usuarios ({users.length})</h2>
                <div className="user-list">
                    {users.map(user => (
                        <div
                            key={user.user_id}
                            className={`user-card ${selectedUser?.id === user.user_id ? 'selected' : ''}`}
                            onClick={() => setSelectedUser({ id: user.user_id, ...user })}
                        >
                            <div className="user-avatar">
                                {(user.owner_name || user.owner_email || 'U')[0].toUpperCase()}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{user.owner_name || 'Sin nombre'}</div>
                                <div className="user-email">{user.owner_email}</div>
                                <div className={`user-status status-${user.onboarding_status?.toLowerCase()}`}>
                                    {user.onboarding_status || 'INCOMPLETE'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="admin-main">
                {!selectedUser ? (
                    <div className="admin-empty">
                        <h2>👈 Selecciona un usuario para ver sus datos</h2>
                    </div>
                ) : (
                    <>
                        <div className="admin-user-header">
                            <div>
                                <h2>{selectedUser.owner_name || 'Usuario sin nombre'}</h2>
                                <p>{selectedUser.owner_email}</p>
                            </div>
                            <div className="user-stats">
                                <div className="stat-box">
                                    <div className="stat-value">{batches.length}</div>
                                    <div className="stat-label">Batches</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">{documents.length}</div>
                                    <div className="stat-label">Documentos</div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            marginBottom: '20px',
                            borderBottom: '1px solid #30363d'
                        }}>
                            <button
                                onClick={() => setActiveTab('batches')}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'batches' ? '2px solid #58a6ff' : '2px solid transparent',
                                    color: activeTab === 'batches' ? '#58a6ff' : '#8b949e',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📦 Batches
                            </button>
                            <button
                                onClick={() => setActiveTab('logs')}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'logs' ? '2px solid #58a6ff' : '2px solid transparent',
                                    color: activeTab === 'logs' ? '#58a6ff' : '#8b949e',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📋 Process Logs
                            </button>
                            <button
                                onClick={() => setActiveTab('onboarding')}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'onboarding' ? '2px solid #58a6ff' : '2px solid transparent',
                                    color: activeTab === 'onboarding' ? '#58a6ff' : '#8b949e',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📊 Onboarding Logs
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'batches' && (
                            <div className="batches-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3>📦 Batches de Importación</h3>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <label style={{ fontSize: '14px', color: '#8b949e' }}>Filtrar por status:</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #30363d',
                                                background: '#0d1117',
                                                color: '#c9d1d9',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="ALL">Todos</option>
                                            <option value="PENDING">Pendiente</option>
                                            <option value="UPLOADING">Subiendo</option>
                                            <option value="PROCESSING">Procesando</option>
                                            <option value="COMPLETED">Completado</option>
                                            <option value="FAILED">Fallido</option>
                                        </select>
                                    </div>
                                </div>
                                {batches.length === 0 ? (
                                    <p className="empty-message">No hay batches para este usuario</p>
                                ) : (
                                    batches
                                        .filter(batch => statusFilter === 'ALL' || batch.status === statusFilter)
                                        .map(batch => {
                                            const batchDocs = documents.filter(d => d.batch_id === batch.batch_id);

                                            return (
                                                <div key={batch.batch_id} className="batch-card">
                                                    <div className="batch-header">
                                                        <div>
                                                            <h4>Batch: {batch.batch_id.substring(0, 8)}...</h4>
                                                            <p>Creado: {new Date(batch.created_at).toLocaleString()}</p>
                                                        </div>
                                                        <div className={`batch-status status-${batch.status?.toLowerCase()}`}>
                                                            {batch.status}
                                                        </div>
                                                    </div>

                                                    <div className="documents-section">
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                            <h5>📄 Documentos ({batchDocs.length})</h5>
                                                            {batchDocs.length > 0 && (
                                                                <button
                                                                    className="process-all-auto-btn"
                                                                    onClick={() => processAllDocumentsAuto(batch.batch_id)}
                                                                    disabled={bulkProcessing}
                                                                >
                                                                    {bulkProcessing ? '⏳ Procesando...' : '⚡ Procesar Todo Automáticamente'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {batchDocs.length === 0 ? (
                                                            <p className="empty-message">No hay documentos en este batch</p>
                                                        ) : (
                                                            <div className="documents-list">
                                                                {batchDocs.map(doc => (
                                                                    <div key={doc.upload_id} className="document-item">
                                                                        <div className="document-header-row">
                                                                            <div className="document-icon">📄</div>
                                                                            <div className="document-info">
                                                                                <div className="document-name">{doc.filename}</div>
                                                                                <div className="document-meta">
                                                                                    <span className="document-type">{doc.doc_type_id}</span>
                                                                                    <span className="document-size">
                                                                                        {(doc.file_size_bytes / 1024).toFixed(1)} KB
                                                                                    </span>
                                                                                    <span className={`document-status status-${doc.upload_status?.toLowerCase()}`}>
                                                                                        {doc.upload_status}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="document-actions">
                                                                                {doc.upload_status === 'PENDING' || doc.upload_status === 'UPLOADED' || doc.upload_status === 'PROCESSING' ? (
                                                                                    <button
                                                                                        className="process-btn"
                                                                                        onClick={() => processDocumentWithAI(doc.upload_id)}
                                                                                        disabled={processing[doc.upload_id]}
                                                                                    >
                                                                                        {processing[doc.upload_id] ? '⏳ Procesando...' : '🤖 Extraer con AI'}
                                                                                    </button>
                                                                                ) : doc.upload_status === 'PROCESSED' ? (
                                                                                    <>
                                                                                        <div className="processed-badge">✅ Procesado</div>
                                                                                        <button
                                                                                            className="view-data-btn"
                                                                                            onClick={() => setExpandedDoc(expandedDoc === doc.upload_id ? null : doc.upload_id)}
                                                                                        >
                                                                                            {expandedDoc === doc.upload_id ? '🔼 Ocultar' : '🔽 Ver Datos'}
                                                                                        </button>
                                                                                    </>
                                                                                ) : doc.upload_status === 'FAILED' ? (
                                                                                    <button
                                                                                        className="process-btn retry"
                                                                                        onClick={() => processDocumentWithAI(doc.upload_id)}
                                                                                        disabled={processing[doc.upload_id]}
                                                                                    >
                                                                                        🔄 Reintentar
                                                                                    </button>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>

                                                                        {/* Extracted Data Panel */}
                                                                        {expandedDoc === doc.upload_id && (doc.extracted_data || extractedDataMap[doc.upload_id]) && (
                                                                            <div className="extracted-data-panel">
                                                                                <h6>📊 Datos Extraídos</h6>
                                                                                {extractedDataMap[doc.upload_id] && (
                                                                                    <div className="extraction-info">
                                                                                        <span>Tipo: {extractedDataMap[doc.upload_id].document_type}</span>
                                                                                        <span>Confianza: {(extractedDataMap[doc.upload_id].confidence * 100).toFixed(0)}%</span>
                                                                                    </div>
                                                                                )}

                                                                                <div className="affected-tables">
                                                                                    <h6>🗂️ Tablas Afectadas:</h6>
                                                                                    {(extractedDataMap[doc.upload_id]?.affected_tables || []).map((table, idx) => (
                                                                                        <div key={idx} className="table-card">
                                                                                            <div className="table-name">
                                                                                                <strong>{table.name}</strong>
                                                                                            </div>
                                                                                            <div className="table-fields">
                                                                                                {table.fields.map((field, fidx) => (
                                                                                                    <span key={fidx} className="field-badge">{field}</span>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>

                                                                                <div className="extracted-fields">
                                                                                    <h6>📝 Campos Extraídos:</h6>
                                                                                    <div className="fields-grid">
                                                                                        {Object.entries(doc.extracted_data || extractedDataMap[doc.upload_id]?.data || {}).map(([key, value]) => (
                                                                                            <div key={key} className="field-item">
                                                                                                <div className="field-key">{key}:</div>
                                                                                                <div className="field-value">{JSON.stringify(value)}</div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="save-to-tables-section">
                                                                                    <button
                                                                                        className="save-to-tables-btn"
                                                                                        onClick={() => saveToTables(doc.upload_id)}
                                                                                        disabled={savingToTables[doc.upload_id]}
                                                                                    >
                                                                                        {savingToTables[doc.upload_id] ? '⏳ Guardando...' : '💾 Guardar a Tablas'}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        )}

                        {/* Onboarding Logs Tab */}
                        {activeTab === 'onboarding' && (
                            <OnboardingEventLogs selectedUserId={selectedUser?.id} />
                        )}

                        {/* Process Logs Tab */}
                        {activeTab === 'logs' && (
                            <div>
                                {batches.length > 0 && (
                                    <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <label style={{ color: '#8b949e', fontSize: '14px' }}>Batch:</label>
                                        <select
                                            value={selectedBatchForLogs || ''}
                                            onChange={(e) => setSelectedBatchForLogs(e.target.value)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #30363d',
                                                background: '#0d1117',
                                                color: '#c9d1d9',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {batches.map(batch => (
                                                <option key={batch.batch_id} value={batch.batch_id}>
                                                    {batch.batch_id.substring(0, 8)}... - {batch.status}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <AdminProcessLogs selectedBatchId={selectedBatchForLogs} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
