import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

function PDFUploader({ onDataExtracted }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedJson, setExtractedJson] = useState(null);
  const [showJson, setShowJson] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    
    const session = await supabase.auth.session();
    const token = session?.access_token;

    try {
      const response = await fetch(`${API_BASE_URL}/api/extract-from-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || 'dummy-token'}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(errData.error || 'Failed to extract data.');
      }

      const data = await response.json();
      setExtractedJson(data);
      setShowJson(true);
      onDataExtracted(data);

    } catch (err) {
      setError(err.message);
      console.error('Error uploading or extracting file:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="pdf-uploader">
          <label htmlFor="pdf-upload" className="btn btn-secondary" style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: 600}}>
              <i className="fas fa-file-import"></i> Import from PDF
          </label>
          <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={isLoading}
          />
        {isLoading && <div style={{marginTop: '10px', color: 'var(--text-muted)'}}>Extracting data...</div>}
        {error && <div style={{marginTop: '10px', color: 'var(--error)'}}>{error}</div>}
      </div>

      {showJson && extractedJson && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--panel-primary)',
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                📋 Datos Extraídos del PDF
              </h2>
              <button
                onClick={() => setShowJson(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              padding: '24px',
              overflow: 'auto',
              flex: 1
            }}>
              <pre style={{
                background: 'var(--panel-secondary)',
                padding: '20px',
                borderRadius: '12px',
                overflow: 'auto',
                fontSize: '13px',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                margin: 0,
                border: '1px solid var(--border)'
              }}>
                {JSON.stringify(extractedJson, null, 2)}
              </pre>
            </div>
            <div style={{
              padding: '24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(extractedJson, null, 2));
                  alert('JSON copiado al portapapeles');
                }}
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-copy"></i> Copiar JSON
              </button>
              <button
                onClick={() => setShowJson(false)}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PDFUploader;
