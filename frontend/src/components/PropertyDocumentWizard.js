import React, { useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

/**
 * Wizard Multi-Paso para Procesar Documentos de Propiedad
 * 
 * Pasos:
 * 1. Closing Document (Documento de cierre)
 * 2. ALTA Statement (Estado de cuenta ALTA)
 * 3. Track/Guarantees (Garantías - HOI, Tax Bill, etc.)
 */
function PropertyDocumentWizard({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [documents, setDocuments] = useState({
    closing: null,
    alta: null,
    guarantees: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [propertyData, setPropertyData] = useState({});
  const [showConsolidatedJSON, setShowConsolidatedJSON] = useState(false);
  const [matrixAnimation, setMatrixAnimation] = useState('');

  const MIN_CONFIDENCE_SCORE = 0.5; // accept low/medium confidence so wizard never returns empty for valid data

  const normalizeConfidence = useCallback((rawConfidence) => {
    if (rawConfidence === null || rawConfidence === undefined) {
      return null;
    }

    if (typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)) {
      return rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
    }

    const normalizedString = String(rawConfidence).trim().toLowerCase();

    if (!normalizedString) {
      return null;
    }

    if (['alta', 'high'].includes(normalizedString)) {
      return 0.9;
    }
    if (['media', 'medium'].includes(normalizedString)) {
      return 0.75;
    }
    if (['baja', 'low'].includes(normalizedString)) {
      return 0.5;
    }

    const numeric = parseFloat(
      normalizedString
        .replace(/,/g, '.')
        .replace(/[^0-9.]/g, '')
    );

    if (Number.isNaN(numeric)) {
      return null;
    }

    return numeric > 1 ? numeric / 100 : numeric;
  }, []);

  const resolveFieldValue = useCallback((fieldData) => {
    if (!fieldData) {
      return null;
    }

    const candidates = [
      fieldData.normalized_value,
      fieldData.value?.normalized,
      fieldData.value?.formatted,
      fieldData.value?.value,
      fieldData.value,
      fieldData.raw_value,
      fieldData.transformed_value
    ];

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === '') {
        continue;
      }

      if (typeof candidate === 'object') {
        if ('amount' in candidate && candidate.amount !== undefined) {
          return candidate.amount;
        }
        if ('value' in candidate && candidate.value !== undefined) {
          return candidate.value;
        }
        try {
          return JSON.stringify(candidate);
        } catch (_) {
          continue;
        }
      }

      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
        continue;
      }

      return candidate;
    }

    return null;
  }, []);

  const steps = [
    {
      id: 1,
      name: 'Closing Document',
      description: 'Documento de cierre de la transacción',
      icon: 'fa-file-contract',
      documentType: 'closing',
      required: true
    },
    {
      id: 2,
      name: 'ALTA Statement',
      description: 'Estado de cuenta ALTA',
      icon: 'fa-file-invoice-dollar',
      documentType: 'alta',
      required: true
    },
    {
      id: 3,
      name: 'Guarantees/Track',
      description: 'Garantías (HOI, Tax Bill, Insurance)',
      icon: 'fa-shield-alt',
      documentType: 'guarantees',
      required: false,
      multiple: true
    }
  ];

  const currentStepInfo = steps.find(s => s.id === currentStep);

  const generateMatrixRain = () => {
    const chars = '01';
    const columns = 20;
    const rows = 8;
    let matrix = '';

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        matrix += chars[Math.floor(Math.random() * chars.length)] + ' ';
      }
      matrix += '\n';
    }

    return matrix;
  };

  const startMatrixAnimation = () => {
    const interval = setInterval(() => {
      setMatrixAnimation(generateMatrixRain());
    }, 100);

    // Detener animación después de 3 segundos
    setTimeout(() => {
      clearInterval(interval);
      setMatrixAnimation('');
    }, 3000);
  };

  const processDocument = async (file, documentType) => {
    setIsProcessing(true);
    setError(null);
    startMatrixAnimation();

    const formData = new FormData();
    formData.append('file', file);

    const session = await supabase.auth.session();
    const token = session?.access_token;

    try {
      console.log(`🚀 Procesando ${documentType} con IA...`);

      const response = await fetch(`${API_BASE_URL}/api/ai-pipeline/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || 'dummy-token'}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to process document.' }));
        throw new Error(errData.message || errData.error || 'Failed to process document.');
      }

      const result = await response.json();
      console.log(`✅ ${documentType} procesado:`, result);

      return result;

    } catch (err) {
      console.error(`Error processing ${documentType}:`, err);
      throw err;
    } finally {
      setIsProcessing(false);
      setMatrixAnimation('');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await processDocument(file, currentStepInfo.documentType);
      
      // Guardar resultado
      if (currentStepInfo.multiple) {
        setDocuments(prev => ({
          ...prev,
          guarantees: [...prev.guarantees, result]
        }));
      } else {
        setDocuments(prev => ({
          ...prev,
          [currentStepInfo.documentType]: result
        }));
      }

      // Merge datos extraídos
      mergeExtractedData(result.extracted_data);

    } catch (err) {
      setError(err.message);
    }
  };

  const mergeExtractedData = (extractedData) => {
    if (!extractedData) {
      return;
    }

    const processField = (merged, field, rawData) => {
      if (!field || !rawData) {
        return;
      }

      const resolvedValue = resolveFieldValue(rawData);
      if (resolvedValue === null || resolvedValue === undefined || resolvedValue === '') {
        return;
      }

      const confidence = normalizeConfidence(
        rawData.confidence ??
        rawData.confidence_label ??
        rawData.confidenceScore ??
        rawData.confidence_pct ??
        rawData.confidence_percent ??
        rawData.confidencePercent ??
        rawData.confidenceValue ??
        rawData.score
      );

      if (confidence !== null && confidence < MIN_CONFIDENCE_SCORE) {
        return;
      }

      const existing = merged[field];
      const confidenceToStore = confidence ?? existing?.confidence ?? MIN_CONFIDENCE_SCORE;

      if (!existing || confidenceToStore >= (existing.confidence ?? 0)) {
        merged[field] = {
          value: resolvedValue,
          confidence: confidenceToStore,
          source: rawData.source_document || currentStepInfo.name,
          source_text: rawData.source_text || rawData.sourceSnippet || rawData.source || existing?.source_text || ''
        };
      }
    };

    setPropertyData(prev => {
      const merged = { ...prev };

      if (Array.isArray(extractedData)) {
        extractedData.forEach((item) => {
          if (!item) {
            return;
          }
          const fieldName =
            item.field ||
            item.field_name ||
            item.name ||
            item.key ||
            item.identifier;
          const payload = item.data || item.payload || item;
          processField(merged, fieldName, payload);
        });
      } else {
        Object.entries(extractedData).forEach(([field, data]) => {
          processField(merged, field, data);
        });
      }

      return merged;
    });
  };

  const buildConsolidatedJSON = () => {
    const consolidated = {
      _metadata: {
        documents_processed: [
          documents.closing ? 'closing' : null,
          documents.alta ? 'alta' : null,
          documents.guarantees.length > 0 ? `${documents.guarantees.length} guarantees` : null
        ].filter(Boolean),
        total_fields: Object.keys(propertyData).length,
        created_at: new Date().toISOString()
      },
      
      documents: {
        closing: documents.closing ? {
          document_id: documents.closing.document_id,
          type: documents.closing.document_type,
          confidence: documents.closing.classification_confidence,
          fields_count: Object.keys(documents.closing.extracted_data || {}).length
        } : null,
        
        alta: documents.alta ? {
          document_id: documents.alta.document_id,
          type: documents.alta.document_type,
          confidence: documents.alta.classification_confidence,
          fields_count: Object.keys(documents.alta.extracted_data || {}).length
        } : null,
        
        guarantees: documents.guarantees.map(doc => ({
          document_id: doc.document_id,
          type: doc.document_type,
          confidence: doc.classification_confidence,
          fields_count: Object.keys(doc.extracted_data || {}).length
        }))
      },
      
      consolidated_data: Object.entries(propertyData).reduce((acc, [field, data]) => {
        acc[field] = {
          value: data.value,
          confidence: data.confidence,
          source_document: data.source,
          source_text: data.source_text?.substring(0, 100)
        };
        return acc;
      }, {}),
      
      form_mapping: Object.entries(propertyData).reduce((acc, [field, data]) => {
        acc[field] = data.value;
        return acc;
      }, {})
    };
    
    return consolidated;
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (!currentStepInfo.required) {
      handleNext();
    }
  };

  const handleComplete = () => {
    const consolidated = buildConsolidatedJSON();
    console.log('📦 JSON Consolidado:', consolidated);

    // Mostrar el JSON consolidado antes de completar
    setShowConsolidatedJSON(true);
  };

  const handleConfirmComplete = () => {
    const consolidated = buildConsolidatedJSON();

    if (onComplete) {
      onComplete({
        documents,
        propertyData,
        consolidated
      });
    }
  };

  const canProceed = () => {
    if (currentStepInfo.required) {
      return documents[currentStepInfo.documentType] !== null;
    }
    return true;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--panel-primary)',
        borderRadius: '24px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '32px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>
                🏠 Property Document Wizard
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>
                Procesa tus documentos paso a paso con IA
              </p>
            </div>
            <button
              onClick={onCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          {/* Progress Steps */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '32px',
            justifyContent: 'space-between'
          }}>
            {steps.map((step, idx) => (
              <div
                key={step.id}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative'
                }}
              >
                {/* Connector Line */}
                {idx < steps.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    right: '-50%',
                    height: '2px',
                    background: step.id < currentStep 
                      ? 'rgba(255, 255, 255, 0.8)' 
                      : 'rgba(255, 255, 255, 0.2)',
                    zIndex: 0
                  }} />
                )}
                
                {/* Step Circle */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: step.id === currentStep 
                    ? 'white'
                    : step.id < currentStep
                    ? 'rgba(255, 255, 255, 0.8)'
                    : 'rgba(255, 255, 255, 0.2)',
                  color: step.id <= currentStep ? '#667eea' : 'rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  zIndex: 1,
                  border: step.id === currentStep ? '3px solid white' : 'none',
                  boxShadow: step.id === currentStep ? '0 0 0 4px rgba(255, 255, 255, 0.3)' : 'none'
                }}>
                  {step.id < currentStep ? '✓' : step.id}
                </div>
                
                {/* Step Label */}
                <div style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  textAlign: 'center',
                  opacity: step.id === currentStep ? 1 : 0.7,
                  fontWeight: step.id === currentStep ? 600 : 400
                }}>
                  {step.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '40px',
          flex: 1,
          overflow: 'auto'
        }}>
          {/* Current Step Info */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            <div style={{
              fontSize: '48px',
              color: 'var(--accent-primary)',
              marginBottom: '16px'
            }}>
              <i className={`fas ${currentStepInfo.icon}`}></i>
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              color: 'var(--text-primary)'
            }}>
              Paso {currentStep}: {currentStepInfo.name}
            </h3>
            <p style={{
              margin: 0,
              color: 'var(--text-muted)',
              fontSize: '15px'
            }}>
              {currentStepInfo.description}
              {currentStepInfo.required && <span style={{ color: 'var(--error)' }}> *</span>}
            </p>
          </div>

          {/* Upload Area */}
          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            background: 'var(--panel-secondary)',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {matrixAnimation && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#00ff00',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '12px',
                lineHeight: '1.2',
                whiteSpace: 'pre',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                animation: 'matrixGlow 0.1s infinite alternate'
              }}>
                <style>
                  {`
                    @keyframes matrixGlow {
                      0% { textShadow: 0 0 5px #00ff00; }
                      100% { textShadow: 0 0 20px #00ff00, 0 0 30px #00ff00; }
                    }
                  `}
                </style>
                {matrixAnimation}
              </div>
            )}

            <label
              htmlFor={`file-upload-step-${currentStep}`}
              style={{
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                position: 'relative',
                zIndex: 5
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: isProcessing
                  ? 'linear-gradient(135deg, #00ff00 0%, #00aa00 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: 'white',
                boxShadow: isProcessing
                  ? '0 8px 24px rgba(0, 255, 0, 0.6)'
                  : '0 8px 24px rgba(102, 126, 234, 0.4)',
                animation: isProcessing ? 'pulse 1s infinite' : 'none'
              }}>
                {isProcessing ? (
                  <i className="fas fa-brain"></i>
                ) : (
                  <i className="fas fa-cloud-upload-alt"></i>
                )}
              </div>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  {isProcessing ? 'ANALYZING DOCUMENT...' : 'Haz clic para subir documento'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)'
                }}>
                  {isProcessing ? 'AI processing in progress' : 'Solo archivos PDF, máximo 10MB'}
                </div>
              </div>
            </label>
            <input
              id={`file-upload-step-${currentStep}`}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isProcessing}
            />
          </div>

          {/* Document Status */}
          {documents[currentStepInfo.documentType] && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--success)'
              }}>
                <i className="fas fa-check-circle" style={{ fontSize: '24px' }}></i>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>
                    Documento procesado exitosamente
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>
                    Tipo: {documents[currentStepInfo.documentType].document_type} | 
                    Confianza: {(documents[currentStepInfo.documentType].classification_confidence * 100).toFixed(0)}% |
                    Campos: {Object.keys(documents[currentStepInfo.documentType].extracted_data || {}).length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guarantees List (Step 3) */}
          {currentStep === 3 && documents.guarantees.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ 
                margin: '0 0 16px 0',
                color: 'var(--text-primary)',
                fontSize: '16px'
              }}>
                Documentos de Garantía Subidos ({documents.guarantees.length})
              </h4>
              {documents.guarantees.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--panel-secondary)',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {doc.document_type.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Confianza: {(doc.classification_confidence * 100).toFixed(0)}% | 
                      Campos: {Object.keys(doc.extracted_data || {}).length}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDocuments(prev => ({
                        ...prev,
                        guarantees: prev.guarantees.filter((_, i) => i !== idx)
                      }));
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '8px'
                    }}
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              color: 'var(--error)',
              marginBottom: '24px'
            }}>
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          {/* Summary (Last Step) */}
          {currentStep === steps.length && !showConsolidatedJSON && (
            <div style={{
              background: 'var(--panel-secondary)',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                📊 Resumen de Documentos Procesados
              </h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Closing Document:</span>
                  <span style={{ fontWeight: 600 }}>
                    {documents.closing ? '✓ Procesado' : '✗ No procesado'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>ALTA Statement:</span>
                  <span style={{ fontWeight: 600 }}>
                    {documents.alta ? '✓ Procesado' : '✗ No procesado'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Garantías:</span>
                  <span style={{ fontWeight: 600 }}>
                    {documents.guarantees.length} documento(s)
                  </span>
                </div>
                <div style={{
                  borderTop: '1px solid var(--border)',
                  marginTop: '12px',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontWeight: 600 }}>Total de Campos Extraídos:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {Object.keys(propertyData).length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Consolidated JSON Display */}
          {showConsolidatedJSON && (
            <div style={{
              background: 'var(--panel-secondary)',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                  📋 JSON Consolidado Final
                </h4>
                <button
                  onClick={() => setShowConsolidatedJSON(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <pre style={{
                background: '#1e1e1e',
                color: '#d4d4d4',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '12px',
                lineHeight: '1.4',
                overflow: 'auto',
                margin: 0,
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
              }}>
                {JSON.stringify(buildConsolidatedJSON(), null, 2)}
              </pre>

              <div style={{
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Revisa el JSON consolidado antes de continuar
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowConsolidatedJSON(false)}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Revisar
                  </button>
                  <button
                    onClick={handleConfirmComplete}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    Continuar al Formulario
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px 32px',
          borderTop: '1px solid var(--border)',
          background: 'var(--panel-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Paso {currentStep} de {steps.length}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={isProcessing}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1
                }}
              >
                <i className="fas fa-arrow-left"></i> Atrás
              </button>
            )}
            
            {!currentStepInfo.required && !documents[currentStepInfo.documentType] && (
              <button
                onClick={handleSkip}
                disabled={isProcessing}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1
                }}
              >
                Saltar
              </button>
            )}
            
            <button
              onClick={handleNext}
              disabled={isProcessing || !canProceed()}
              style={{
                padding: '12px 24px',
                background: canProceed() && !isProcessing
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'var(--border)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: (isProcessing || !canProceed()) ? 'not-allowed' : 'pointer',
                opacity: (isProcessing || !canProceed()) ? 0.5 : 1,
                boxShadow: canProceed() && !isProcessing ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
              }}
            >
              {currentStep === steps.length ? (
                <>
                  <i className="fas fa-check"></i> Finalizar
                </>
              ) : (
                <>
                  Siguiente <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDocumentWizard;



