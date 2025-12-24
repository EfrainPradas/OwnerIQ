import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PropertyDocuments = ({ propertyId, userId }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const documentTypes = [
    { value: 'purchase_agreement', label: 'Purchase Agreement' },
    { value: 'closing_documents', label: 'Closing Documents' },
    { value: 'title_deed', label: 'Title Deed' },
    { value: 'inspection_report', label: 'Inspection Report' },
    { value: 'appraisal', label: 'Appraisal' },
    { value: 'insurance_policy', label: 'Insurance Policy' },
    { value: 'tax_documents', label: 'Tax Documents' },
    { value: 'lease_agreement', label: 'Lease Agreement' },
    { value: 'maintenance_records', label: 'Maintenance Records' },
    { value: 'warranty', label: 'Warranty' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (propertyId) {
      fetchDocuments();
    }
  }, [propertyId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      console.log('📄 Fetching documents for property:', propertyId);

      // List all files in the property folder from Supabase Storage
      const { data, error } = await supabase.storage
        .from('property-documents')
        .list(propertyId, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('❌ Error listing documents from storage:', error);
        throw error;
      }

      console.log('✅ Found documents in storage:', data);

      // Transform storage file list into document format
      const transformedDocs = (data || []).map(file => {
        // Extract document type from filename if it contains it
        const filenameParts = file.name.split('_');
        let documentType = 'other';

        // If filename follows pattern: doctype_timestamp_originalname.ext
        if (filenameParts.length >= 2) {
          const possibleType = filenameParts[0];
          const validTypes = documentTypes.map(dt => dt.value);
          if (validTypes.includes(possibleType)) {
            documentType = possibleType;
          }
        }

        // Get public URL for the file
        const { data: { publicUrl } } = supabase.storage
          .from('property-documents')
          .getPublicUrl(`${propertyId}/${file.name}`);

        return {
          document_id: file.id,
          file_name: file.name,
          file_path: `${propertyId}/${file.name}`,
          file_size_bytes: file.metadata?.size || 0,
          mime_type: file.metadata?.mimetype || '',
          document_type: documentType,
          upload_date: file.created_at || file.updated_at,
          public_url: publicUrl
        };
      });

      setDocuments(transformedDocs);
      console.log('📊 Transformed documents:', transformedDocs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event, documentType, description) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      console.log('📤 Uploading document:', file.name, 'Type:', documentType);

      // Create filename with document type prefix for easier identification
      const timestamp = Date.now();
      const fileName = `${documentType}_${timestamp}_${file.name}`;
      const filePath = `${propertyId}/${fileName}`;

      console.log('📂 Upload path:', filePath);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ Document uploaded successfully:', filePath);

      setSuccess('Document uploaded successfully!');
      fetchDocuments();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      console.log('⬇️ Downloading document:', document.file_path);

      const { data, error } = await supabase.storage
        .from('property-documents')
        .download(document.file_path);

      if (error) {
        console.error('❌ Download error:', error);
        throw error;
      }

      console.log('✅ Document downloaded successfully');

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document');
    }
  };

  const handleDelete = async (documentId, filePath) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting document:', filePath);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('❌ Delete error:', storageError);
        throw storageError;
      }

      console.log('✅ Document deleted successfully');

      setSuccess('Document deleted successfully!');
      fetchDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
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
    const docType = documentTypes.find(dt => dt.value === type);
    return docType ? docType.label : type;
  };

  const getFileIcon = (mimeType, fileName) => {
    if (!mimeType && !fileName) return { icon: 'fa-file', color: '#6C8AFF' };
    
    const mime = mimeType?.toLowerCase() || '';
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    
    // PDF files
    if (mime.includes('pdf') || ext === 'pdf') {
      return { icon: 'fa-file-pdf', color: '#EF4444' };
    }
    
    // Image files
    if (mime.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return { icon: 'fa-file-image', color: '#22C55E' };
    }
    
    // Word documents
    if (mime.includes('word') || mime.includes('msword') || ['doc', 'docx'].includes(ext)) {
      return { icon: 'fa-file-word', color: '#2B5797' };
    }
    
    // Excel files
    if (mime.includes('excel') || mime.includes('spreadsheet') || ['xls', 'xlsx'].includes(ext)) {
      return { icon: 'fa-file-excel', color: '#10B981' };
    }
    
    // PowerPoint files
    if (mime.includes('presentation') || ['ppt', 'pptx'].includes(ext)) {
      return { icon: 'fa-file-powerpoint', color: '#F59E0B' };
    }
    
    // Text files
    if (mime.includes('text') || ext === 'txt') {
      return { icon: 'fa-file-alt', color: '#6B7280' };
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return { icon: 'fa-file-archive', color: '#8B5CF6' };
    }
    
    // Default
    return { icon: 'fa-file', color: '#6C8AFF' };
  };

  const [showUploadForm, setShowUploadForm] = useState(false);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(90vh - 100px)' }}>
      {/* Success/Error Messages */}
      {success && (
        <div style={{
          padding: '12px',
          marginBottom: '15px',
          backgroundColor: 'rgba(34,197,94,0.1)',
          borderRadius: '6px',
          borderLeft: '4px solid var(--success)',
          color: 'var(--success)'
        }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '15px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          borderRadius: '6px',
          borderLeft: '4px solid var(--error)',
          color: 'var(--error)'
        }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
          {error}
        </div>
      )}

      {/* Header with Upload Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '20px' }}>
          <i className="fas fa-folder-open" style={{ marginRight: '10px' }}></i>
          Uploaded Documents ({documents.length})
        </h3>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          style={{
            padding: '10px 20px',
            background: showUploadForm ? 'var(--panel-secondary)' : 'var(--accent-primary)',
            color: showUploadForm ? 'var(--text-primary)' : 'white',
            border: showUploadForm ? '1px solid var(--border)' : 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
        >
          <i className={`fas ${showUploadForm ? 'fa-times' : 'fa-upload'}`}></i>
          {showUploadForm ? 'Cancel' : 'Upload Document'}
        </button>
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div style={{
          background: 'var(--panel-secondary)',
          padding: '20px',
          borderRadius: 'var(--border-radius)',
          marginBottom: '20px',
          border: '2px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-circle-notch fa-spin" style={{ color: 'var(--accent-primary)', fontSize: '20px' }}></i>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Uploading document...</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Large files may take a few moments. Please keep this window open.</div>
          </div>
        </div>
      )}

      {/* Collapsible Upload Section */}
      {showUploadForm && (
        <div style={{
          background: 'var(--panel-secondary)',
          padding: '20px',
          borderRadius: 'var(--border-radius)',
          marginBottom: '20px',
          border: '2px solid var(--accent-primary)'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--accent-primary)' }}>
            <i className="fas fa-cloud-upload-alt" style={{ marginRight: '8px' }}></i>
            Select Document Type to Upload
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {documentTypes.map(docType => (
              <div key={docType.value} style={{
                position: 'relative'
              }}>
                <input
                  type="file"
                  id={`upload-${docType.value}`}
                  onChange={(e) => {
                    handleFileUpload(e, docType.value, '');
                    setShowUploadForm(false);
                  }}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor={`upload-${docType.value}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    background: 'var(--panel-primary)',
                    borderRadius: '8px',
                    border: '2px dashed var(--border)',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: '100px',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.background = 'var(--panel-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--panel-primary)';
                  }}
                >
                  <i className="fas fa-file-upload" style={{
                    fontSize: '24px',
                    color: 'var(--accent-primary)',
                    marginBottom: '8px'
                  }}></i>
                  <span style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    {docType.label}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '4px'
                  }}>
                    Click to upload
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents List - Scrollable */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
            <p>Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 40px',
            background: 'var(--panel-secondary)',
            borderRadius: 'var(--border-radius)',
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-folder-open" style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}></i>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>No documents uploaded yet</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>
              Click "Upload Document" above to add your first document
            </p>
            {!showUploadForm && (
              <button
                onClick={() => setShowUploadForm(true)}
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-upload"></i>
                Upload First Document
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '15px'
          }}>
            {documents.map(doc => (
              <div key={doc.document_id} style={{
                padding: '16px',
                background: 'var(--panel-secondary)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  {(() => {
                    const fileIcon = getFileIcon(doc.mime_type, doc.file_name);
                    return (
                      <div style={{
                        width: '52px',
                        height: '52px',
                        background: `linear-gradient(135deg, ${fileIcon.color}25 0%, ${fileIcon.color}10 100%)`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: `2px solid ${fileIcon.color}40`,
                        boxShadow: `0 3px 10px ${fileIcon.color}30`
                      }}>
                        <i className={`fas ${fileIcon.icon}`} style={{
                          color: fileIcon.color,
                          fontSize: '30px',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}></i>
                      </div>
                    );
                  })()}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {doc.file_name}
                    </div>
                    <div style={{
                      padding: '3px 8px',
                      background: 'rgba(108,138,255,0.15)',
                      color: 'var(--accent-primary)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'inline-block',
                      marginBottom: '6px'
                    }}>
                      {getDocumentTypeLabel(doc.document_type)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatFileSize(doc.file_size_bytes)} â€¢ {new Date(doc.upload_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '12px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(doc);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#5a7cff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                    }}
                  >
                    <i className="fas fa-download"></i>
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.document_id, doc.file_path);
                    }}
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      color: 'var(--error)',
                      border: '1px solid var(--error)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--error)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--error)';
                    }}
                  >
                    <i className="fas fa-trash-alt"></i>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDocuments;
