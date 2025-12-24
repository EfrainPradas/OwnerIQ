import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

/**
 * Componente para subir documentos adicionales a una propiedad EXISTENTE
 * Diferente del flujo de creación de propiedad con AI
 */
const PropertyDocumentBulkUpload = ({ propertyId, userId, onComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [showUploader, setShowUploader] = useState(false);

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
      const uploadedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length, stage: 'uploading' });

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `property-documents/${propertyId}/${fileName}`;

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

      // Paso 2: Procesar con AI Pipeline
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

      // Paso 3: Guardar metadatos en la base de datos
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
          description: `AI: ${result.document_type} (${(result.classification_confidence * 100).toFixed(0)}% confidence)`,
          uploaded_by: userId,
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

      setResults({
        success: true,
        batch_id: aiResults.batch_id,
        summary: aiResults.summary,
        results: aiResults.results,
        errors: aiResults.errors,
        by_document_type: aiResults.by_document_type
      });

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
      'closing_alta': 'Closing/ALTA',
      'home_owner_insurance': 'Home Insurance',
      'tax_bill': 'Tax Bill',
      'lease_agreement': 'Lease',
      'mortgage_statement': 'Mortgage',
      'first_payment_letter': 'First Payment',
      'initial_escrow': 'Escrow',
      'exhibit_a': 'Exhibit A',
      'unknown': 'Other'
    };
    return labels[type] || type;
  };

  if (!showUploader) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowUploader(true)}
          style={{
            padding: '12px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-folder-plus"></i>
          Bulk Upload Additional Documents
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px dashed #e5e7eb'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0, color: '#111827' }}>
          📁 Add Multiple Documents to Property
        </h4>
        <button
          onClick={() => {
            setShowUploader(false);
            setFiles([]);
            setResults(null);
            setError('');
          }}
          style={{
            padding: '6px 12px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕ Close
        </button>
      </div>

      {!uploading && !results && (
        <>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '15px' }}>
            Upload PDFs to classify and store with this property. Each will be processed with AI.
          </p>

          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <label style={{
              padding: '10px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
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
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
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
            <>
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '10px'
              }}>
                {files.map((file, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px',
                    fontSize: '12px',
                    borderBottom: index < files.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <span>📄 {file.name} ({formatFileSize(file.size)})</span>
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
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
                  padding: '10px 20px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                🚀 Upload & Process ({files.length} files)
              </button>
            </>
          )}
        </>
      )}

      {uploading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            margin: '0 auto 15px',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
            {progress.stage === 'uploading' && '📤 Uploading...'}
            {progress.stage === 'processing' && '🤖 AI Processing...'}
            {progress.stage === 'saving' && '💾 Saving...'}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            {progress.current} / {progress.total}
          </div>
        </div>
      )}

      {results && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '10px' }}>
            ✅ Processed {results.summary.successful} documents successfully!
          </div>

          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
            {Object.entries(results.by_document_type).map(([type, count]) => (
              <span key={type} style={{ marginRight: '12px' }}>
                {getDocumentTypeLabel(type)}: {count}
              </span>
            ))}
          </div>

          <button
            onClick={() => {
              setFiles([]);
              setResults(null);
              setShowUploader(false);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Done
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          borderRadius: '4px',
          color: '#dc2626',
          fontSize: '13px',
          marginTop: '10px'
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

export default PropertyDocumentBulkUpload;
