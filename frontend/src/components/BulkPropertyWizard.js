import React, { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabaseClient';

/**
 * Bulk Property Wizard - Crea una nueva propiedad desde una carpeta completa de documentos
 * Similar a PropertyDocumentWizard pero acepta múltiples archivos de una vez
 */
function BulkPropertyWizard({ onComplete, onCancel }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [processedDocuments, setProcessedDocuments] = useState([]);

  const MIN_CONFIDENCE_SCORE = 0.5;

  const normalizeConfidence = useCallback((rawConfidence) => {
    if (rawConfidence === null || rawConfidence === undefined) return null;
    if (typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)) {
      return rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
    }
    const normalizedString = String(rawConfidence).trim().toLowerCase();
    if (['alta', 'high'].includes(normalizedString)) return 0.9;
    if (['media', 'medium'].includes(normalizedString)) return 0.75;
    if (['baja', 'low'].includes(normalizedString)) return 0.5;
    const numeric = parseFloat(normalizedString.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
    if (Number.isNaN(numeric)) return null;
    return numeric > 1 ? numeric / 100 : numeric;
  }, []);

  const resolveFieldValue = useCallback((fieldData) => {
    if (!fieldData) return null;
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
      if (candidate === null || candidate === undefined || candidate === '') continue;
      if (typeof candidate === 'object') {
        if ('amount' in candidate && candidate.amount !== undefined) return candidate.amount;
        if ('value' in candidate && candidate.value !== undefined) return candidate.value;
        try { return JSON.stringify(candidate); } catch (_) { continue; }
      }
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
      }
      return candidate;
    }
    return null;
  }, []);

  const handleFolderSelect = (event) => {
    const selectedFiles = Array.from(event.target.files).filter(
      file => file.type === 'application/pdf'
    );
    setFiles(selectedFiles);
    setError('');
    setResults(null);
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files).filter(
      file => file.type === 'application/pdf'
    );
    setFiles(selectedFiles);
    setError('');
    setResults(null);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const processAllDocuments = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress({ current: 0, total: files.length, stage: 'Initializing AI...' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'dummy-token';

      // Procesar documentos UNO POR UNO para mostrar progreso
      const results = [];
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({
          current: i,
          total: files.length,
          stage: `Processing ${file.name}...`
        });

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${API_BASE_URL}/api/ai-pipeline/process`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || 'Failed to process document');
          }

          const result = await response.json();
          results.push({
            filename: file.name,
            document_id: result.document_id,
            document_type: result.document_type,
            classification_confidence: result.classification_confidence,
            extracted_data: result.extracted_data,
            validation: result.validation,
          });

          // Actualizar progreso
          setProgress({
            current: i + 1,
            total: files.length,
            stage: `Processed ${i + 1}/${files.length} documents`
          });

        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          errors.push({ filename: file.name, error: err.message });
        }
      }

      setProgress({ current: files.length, total: files.length, stage: 'Consolidating data...' });

      // Consolidar datos de todos los documentos
      const consolidatedData = consolidateDocumentData(results);

      // Guardar documentos procesados en el state
      setProcessedDocuments(results);

      setResults({
        ...consolidatedData,
        _errors: errors
      });

      setProgress({ current: files.length, total: files.length, stage: 'Complete!' });

      // No llamar automáticamente a onComplete - esperar a que usuario haga click en "Continue"

    } catch (err) {
      console.error('Error processing documents:', err);
      setError(err.message || 'Failed to process documents');
    } finally {
      setIsProcessing(false);
    }
  };

  const consolidateDocumentData = (documents) => {
    const fieldsByName = {};
    const documentsProcessed = [];

    // Consolidar todos los campos extraídos
    documents.forEach(doc => {
      documentsProcessed.push(doc.filename);
      const extractedData = doc.extracted_data || {};

      Object.entries(extractedData).forEach(([fieldName, fieldData]) => {
        const confidence = normalizeConfidence(fieldData.confidence);
        const value = resolveFieldValue(fieldData);

        if (value !== null && value !== undefined && confidence >= MIN_CONFIDENCE_SCORE) {
          if (!fieldsByName[fieldName]) {
            fieldsByName[fieldName] = [];
          }
          fieldsByName[fieldName].push({
            value,
            confidence,
            source: doc.filename,
            document_type: doc.document_type
          });
        }
      });
    });

    // Seleccionar el mejor valor para cada campo (mayor confianza)
    const consolidated_data = {};
    const form_mapping = {};

    Object.entries(fieldsByName).forEach(([fieldName, candidates]) => {
      // Ordenar por confianza descendente
      candidates.sort((a, b) => b.confidence - a.confidence);
      const best = candidates[0];

      consolidated_data[fieldName] = {
        value: best.value,
        confidence: best.confidence,
        source: best.source,
        alternatives: candidates.slice(1).map(c => ({
          value: c.value,
          confidence: c.confidence,
          source: c.source
        }))
      };

      form_mapping[fieldName] = best.value;
    });

    // Calcular first_payment_date automáticamente si tenemos closing_date
    if (form_mapping.closing_date && !form_mapping.first_payment_date) {
      try {
        const closingDate = new Date(form_mapping.closing_date);
        // Primer pago es 1 mes después del cierre
        const firstPaymentDate = new Date(closingDate);
        firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1);

        const firstPaymentStr = firstPaymentDate.toISOString().split('T')[0];

        form_mapping.first_payment_date = firstPaymentStr;
        consolidated_data.first_payment_date = {
          value: firstPaymentStr,
          confidence: 0.95,
          source: 'auto-calculated from closing_date',
          alternatives: []
        };

        console.log('✅ Auto-calculated first_payment_date:', {
          closing_date: form_mapping.closing_date,
          first_payment_date: firstPaymentStr
        });
      } catch (err) {
        console.error('Error calculating first_payment_date:', err);
      }
    }

    return {
      consolidated_data,
      form_mapping,
      _metadata: {
        documents_processed: documentsProcessed,
        total_fields: Object.keys(consolidated_data).length,
        processed_at: new Date().toISOString()
      }
    };
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--panel-primary)',
        borderRadius: '20px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
        border: '1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, marginBottom: '8px', fontSize: '24px' }}>
                📁 Create Property from Folder
              </h2>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Upload all property documents at once - AI will extract and consolidate the data
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                padding: '8px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '32px',
          overflow: 'auto',
          flex: 1,
          background: 'var(--panel-primary)'
        }}>
          {!isProcessing && !results && (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Select a folder containing all your property documents (Closing, ALTA, Insurance, Tax Bills, etc.).
                The AI will process all files and extract the information to create a new property.
              </p>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
                <label style={{
                  padding: '12px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📂 Select Folder
                  <input
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    onChange={handleFolderSelect}
                    style={{ display: 'none' }}
                    disabled={isProcessing}
                  />
                </label>

                <label style={{
                  padding: '12px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📄 Select Multiple Files
                  <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={isProcessing}
                  />
                </label>
              </div>

              {files.length > 0 && (
                <>
                  <div style={{
                    marginBottom: '20px',
                    padding: '16px',
                    background: 'var(--panel-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                      Selected Files ({files.length})
                    </h3>
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      display: 'grid',
                      gap: '8px'
                    }}>
                      {files.map((file, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--panel-primary)',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: 'var(--text-primary)'
                        }}>
                          <span>📄 {file.name} ({formatFileSize(file.size)})</span>
                          <button
                            onClick={() => removeFile(index)}
                            style={{
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={processAllDocuments}
                    style={{
                      padding: '14px 28px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    🚀 Process {files.length} Documents with AI
                  </button>
                </>
              )}
            </>
          )}

          {isProcessing && (
            <div style={{ padding: '40px 20px' }}>
              {/* Matrix-style progress indicator */}
              <div style={{
                background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
                border: '2px solid #00ff41',
                borderRadius: '12px',
                padding: '30px',
                boxShadow: '0 0 30px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Animated background grid */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: 0.3,
                  animation: 'matrixScroll 20s linear infinite'
                }} />

                {/* Progress text */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: '25px', textAlign: 'center' }}>
                  <div style={{
                    fontSize: '24px',
                    color: '#00ff41',
                    marginBottom: '10px',
                    fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(0, 255, 65, 0.8)',
                    fontFamily: 'monospace',
                    letterSpacing: '2px'
                  }}>
                    [ AI PROCESSING ]
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#00ff41',
                    opacity: 0.8,
                    fontFamily: 'monospace',
                    animation: 'blink 1.5s infinite'
                  }}>
                    {progress.stage}
                  </div>
                </div>

                {/* Progress bar container */}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid #00ff41',
                  borderRadius: '8px',
                  height: '40px',
                  overflow: 'hidden',
                  marginBottom: '20px'
                }}>
                  {/* Progress fill */}
                  <div style={{
                    height: '100%',
                    width: `${(progress.current / progress.total) * 100}%`,
                    background: 'linear-gradient(90deg, #00ff41 0%, #00cc33 100%)',
                    transition: 'width 0.5s ease-out',
                    boxShadow: '0 0 20px rgba(0, 255, 65, 0.6)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Animated scan line */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'rgba(255, 255, 255, 0.8)',
                      animation: 'scanLine 2s linear infinite'
                    }} />
                  </div>

                  {/* Progress text overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: progress.current > 0 ? '#000' : '#00ff41',
                    textShadow: progress.current > 0 ? 'none' : '0 0 10px rgba(0, 255, 65, 0.8)',
                    fontFamily: 'monospace',
                    zIndex: 2
                  }}>
                    {progress.current} / {progress.total}
                  </div>
                </div>

                {/* Document counter */}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#00ff41',
                  opacity: 0.7,
                  fontFamily: 'monospace'
                }}>
                  ⏱️ Processing time: ~{Math.round((progress.current * 45) / 60)} min {((progress.current * 45) % 60).toFixed(0)} sec
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fee2e2',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              ❌ {error}
            </div>
          )}

          {results && !isProcessing && (
            <div style={{
              padding: '20px',
              background: 'var(--panel-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#10b981', fontSize: '18px' }}>
                ✅ Documents Processed Successfully!
              </h3>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                <strong>Documents processed:</strong> {results._metadata.documents_processed.length}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                <strong>Fields extracted:</strong> {results._metadata.total_fields}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>
                Click "Continue" to review and create the property
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          background: 'var(--panel-secondary)'
        }}>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isProcessing ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          {results && (
            <button
              onClick={() => onComplete && onComplete({
                consolidated: results,
                files: files,
                results: processedDocuments
              })}
              style={{
                padding: '10px 24px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Continue to Create Property
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes matrixScroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }

        @keyframes scanLine {
          0% { top: 0; opacity: 1; }
          50% { opacity: 0.5; }
          100% { top: 100%; opacity: 1; }
        }

        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default BulkPropertyWizard;
