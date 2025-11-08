import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

const BulkDocumentUploader = ({ propertyId, userId, onComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

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

  const uploadAndProcess = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    setUploading(true);
    setError('');
    setProgress({ current: 0, total: files.length });

    try {
      // Paso 1: Subir archivos a Supabase Storage
      console.log('📤 Uploading files to Supabase Storage...');
      const uploadedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length, stage: 'uploading' });

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `property-documents/${propertyId || 'temp'}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('OwnerIQ')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          originalName: file.name,
          storagePath: filePath,
          size: file.size
        });
      }

      console.log('✅ Files uploaded to storage');

      // Paso 2: Procesar con AI Pipeline
      console.log('🤖 Processing with AI Pipeline...');
      setProgress({ current: 0, total: files.length, stage: 'processing' });

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('property_id', propertyId);

      const token = localStorage.getItem('access_token') || 'dummy-token';
      const response = await fetch(`${API_BASE_URL}/api/ai-pipeline/process-batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`AI processing failed: ${response.statusText}`);
      }

      const aiResults = await response.json();
      console.log('✅ AI processing completed:', aiResults);

      // Paso 3: Guardar metadatos en la base de datos
      console.log('💾 Saving to database...');
      setProgress({ current: 0, total: aiResults.results.length, stage: 'saving' });

      const documentsToInsert = aiResults.results.map((result, index) => {
        const uploadedFile = uploadedFiles[index];
        return {
          property_id: propertyId,
          document_type: result.document_type,
          file_name: result.filename,
          file_size_bytes: uploadedFile.size,
          file_path: uploadedFile.storagePath,
          mime_type: 'application/pdf',
          description: `AI Classified: ${result.document_type} (${(result.classification_confidence * 100).toFixed(0)}% confidence)`,
          uploaded_by: userId,
          // Guardar datos extraídos como metadata
          metadata: {
            ai_document_id: result.document_id,
            classification_confidence: result.classification_confidence,
            extracted_fields_count: Object.keys(result.extracted_data).length,
            validation_status: result.validation.is_valid ? 'valid' : 'invalid',
            validation_errors: result.validation.errors?.length || 0,
            validation_warnings: result.validation.warnings?.length || 0
          }
        };
      });

      const { error: dbError } = await supabase
        .from('property_document')
        .insert(documentsToInsert);

      if (dbError) throw dbError;

      console.log('✅ Documents saved to database');

      setResults({
        success: true,
        batch_id: aiResults.batch_id,
        summary: aiResults.summary,
        results: aiResults.results,
        errors: aiResults.errors,
        by_document_type: aiResults.by_document_type
      });

      // Notificar al componente padre
      if (onComplete) {
        onComplete(aiResults);
      }

    } catch (err) {
      console.error('Error in bulk upload:', err);
      setError(err.message || 'Failed to upload and process documents');
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      'closing_alta': 'Closing/ALTA Statement',
      'home_owner_insurance': 'Home Owner Insurance',
      'tax_bill': 'Tax Bill',
      'lease_agreement': 'Lease Agreement',
      'mortgage_statement': 'Mortgage Statement',
      'first_payment_letter': 'First Payment Letter',
      'initial_escrow': 'Initial Escrow Disclosure',
      'exhibit_a': 'Exhibit A',
      'unknown': 'Unclassified Document'
    };
    return labels[type] || type;
  };

  return (
    <div className="bulk-document-uploader" style={{
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      marginTop: '20px'
    }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>
        📁 Bulk Document Upload & AI Processing
      </h3>

      <p style={{ color: '#666', fontSize: '14px' }}>
        Upload multiple PDF documents from a folder. Each document will be automatically classified
        and processed using AI to extract property information.
      </p>

      {!uploading && !results && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}>
              📂 Select Folder
              <input
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderSelect}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </label>

            <label style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#2196F3',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              📄 Select Files
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Selected Files ({files.length})</h4>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px'
              }}>
                {files.map((file, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    borderBottom: index < files.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    <span style={{ fontSize: '14px' }}>
                      📄 {file.name} <span style={{ color: '#999' }}>({formatFileSize(file.size)})</span>
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={uploadAndProcess}
                style={{
                  marginTop: '15px',
                  padding: '12px 24px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                🚀 Upload & Process with AI
              </button>
            </div>
          )}
        </>
      )}

      {uploading && (
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '6px solid #f3f3f3',
            borderTop: '6px solid #4CAF50',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />

          <h3 style={{ color: '#333' }}>
            {progress.stage === 'uploading' && '📤 Uploading to Storage...'}
            {progress.stage === 'processing' && '🤖 Processing with AI...'}
            {progress.stage === 'saving' && '💾 Saving to Database...'}
          </h3>

          <p style={{ fontSize: '18px', color: '#666' }}>
            {progress.current} / {progress.total}
          </p>

          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: '#f3f3f3',
            borderRadius: '5px',
            overflow: 'hidden',
            marginTop: '10px'
          }}>
            <div style={{
              width: `${(progress.current / progress.total) * 100}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {results && (
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#4CAF50' }}>✅ Processing Complete!</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                {results.summary.successful}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Successful</div>
            </div>

            <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
                {results.summary.failed}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Failed</div>
            </div>

            <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
                {(results.summary.duration_ms / 1000).toFixed(1)}s
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Duration</div>
            </div>
          </div>

          <h4>Documents by Type:</h4>
          <div style={{ marginBottom: '20px' }}>
            {Object.entries(results.by_document_type).map(([type, count]) => (
              <div key={type} style={{
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{getDocumentTypeLabel(type)}</span>
                <span style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {count}
                </span>
              </div>
            ))}
          </div>

          <h4>Processed Documents:</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {results.results.map((result, index) => (
              <div key={index} style={{
                padding: '12px',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
                marginBottom: '10px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  📄 {result.filename}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Type: <strong>{getDocumentTypeLabel(result.document_type)}</strong>
                  {' • '}
                  Confidence: <strong>{(result.classification_confidence * 100).toFixed(0)}%</strong>
                  {' • '}
                  Fields Extracted: <strong>{Object.keys(result.extracted_data).length}</strong>
                  {' • '}
                  Status: {result.validation.is_valid ?
                    <span style={{ color: '#4CAF50' }}>✓ Valid</span> :
                    <span style={{ color: '#f44336' }}>⚠ Has Warnings</span>
                  }
                </div>
              </div>
            ))}
          </div>

          {results.errors && results.errors.length > 0 && (
            <>
              <h4 style={{ color: '#f44336' }}>Errors:</h4>
              <div>
                {results.errors.map((err, index) => (
                  <div key={index} style={{
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    color: '#f44336'
                  }}>
                    <strong>{err.filename}:</strong> {err.error}
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            onClick={() => {
              setFiles([]);
              setResults(null);
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Upload More Documents
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          color: '#f44336',
          marginTop: '15px'
        }}>
          ❌ {error}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BulkDocumentUploader;
