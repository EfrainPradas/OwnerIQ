import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

/**
 * Matrix Binary Animation Component
 */
function MatrixBinaryRain({ isActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const columns = Math.floor(canvas.width / 20);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0';
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? '1' : '0';
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.3,
        pointerEvents: 'none'
      }}
    />
  );
}

/**
 * Component to upload up to 3 PDFs and process them with AI Pipeline
 * Shows classification, extraction with confidence, and traceability
 * Saves documents to Supabase Storage
 */
function AIPDFUploader({ onDataExtracted, propertyId }) {
  const [documents, setDocuments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);

  const MAX_DOCUMENTS = 3;
  const DOCUMENT_TYPES = ['Closing Doc', 'ALTA Statement', 'Warranties'];
  const STORAGE_BUCKET = 'OwnerIQ';
  const STORAGE_PATH = 'property-documents';

  const uploadToSupabase = async (file, documentType) => {
    try {
      const timestamp = Date.now();
      const fileName = `${STORAGE_PATH}/${propertyId || 'temp'}/${timestamp}_${file.name}`;

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading to Supabase:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      return {
        path: fileName,
        url: urlData.publicUrl
      };
    } catch (err) {
      console.error('Failed to upload to Supabase Storage:', err);
      return null;
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) {
      return;
    }

    if (documents.length >= MAX_DOCUMENTS) {
      alert(`Maximum ${MAX_DOCUMENTS} documents allowed`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setShowModal(true);
    setProgress(0);
    setProcessingStage('Uploading document...');

    const formData = new FormData();
    formData.append('file', file);
    if (propertyId) {
      formData.append('property_id', propertyId);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      console.log('🚀 Sending document to AI Pipeline...');
      setProgress(10);
      setProcessingStage('Extracting text from PDF...');

      const response = await fetch(`${API_BASE_URL}/api/ai-pipeline/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || 'dummy-token'}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(errData.message || errData.error || 'Failed to process document.');
      }

      setProgress(40);
      setProcessingStage('Classifying document with AI...');

      const data = await response.json();
      console.log('✅ AI Pipeline completed:', data);

      setProgress(70);
      // Upload to Supabase Storage
      setProcessingStage('Saving document to storage...');
      const storageResult = await uploadToSupabase(file, data.document_type);

      setProgress(90);

      // Add document to list
      const newDocuments = [...documents, {
        filename: file.name,
        result: data,
        storage: storageResult,
        index: documents.length
      }];
      setDocuments(newDocuments);

      setProgress(100);

      // Show completion message
      if (newDocuments.length >= MAX_DOCUMENTS) {
        setProcessingStage(`All ${MAX_DOCUMENTS} documents processed successfully!`);
      } else {
        setProcessingStage(`Document ${newDocuments.length}/${MAX_DOCUMENTS} processed. Ready for next document.`);
      }

    } catch (err) {
      setError(err.message);
      setProcessingStage('Error processing document');
      console.error('Error processing document with AI:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = null; // Reset input
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleCopyToForm = () => {
    if (documents.length === 0) {
      return;
    }

    // Combine all extracted data from documents
    const combinedData = {};

    documents.forEach(doc => {
      const extracted = doc.result.extracted_data || {};
      Object.entries(extracted).forEach(([field, data]) => {
        // If field doesn't exist or has lower confidence, use new value
        if (!combinedData[field] || combinedData[field].confidence < data.confidence) {
          combinedData[field] = data;
        }
      });
    });

    console.log('📋 Combined data from all documents:', combinedData);

    // Helper to get value from field object
    const getValue = (fieldName) => {
      return combinedData[fieldName]?.value || '';
    };

    // Parse address into components if it's a full address
    const fullAddress = getValue('property_address');
    let parsedAddress = {
      street: fullAddress,
      city: '',
      state: '',
      zip: ''
    };

    // Try to parse the full address (format: "Street, City, ST ZIP")
    if (fullAddress && fullAddress.includes(',')) {
      const parts = fullAddress.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        parsedAddress.street = parts[0];
        parsedAddress.city = parts[1];
        const stateZip = parts[2].split(' ').filter(Boolean);
        if (stateZip.length >= 2) {
          parsedAddress.state = stateZip[0];
          parsedAddress.zip = stateZip[1];
        }
      } else if (parts.length === 2) {
        parsedAddress.street = parts[0];
        const cityStateZip = parts[1].split(' ').filter(Boolean);
        if (cityStateZip.length >= 3) {
          parsedAddress.city = cityStateZip.slice(0, -2).join(' ');
          parsedAddress.state = cityStateZip[cityStateZip.length - 2];
          parsedAddress.zip = cityStateZip[cityStateZip.length - 1];
        }
      }
    }

    // Map flat AI Pipeline structure to nested structure expected by form
    const mappedData = {
      property: {
        address: parsedAddress.street || getValue('property_address'),
        full_address: getValue('property_address'),
        city: parsedAddress.city || getValue('property_city') || getValue('city'),
        state: parsedAddress.state || getValue('property_state') || getValue('state'),
        zip: parsedAddress.zip || getValue('property_zip') || getValue('zip_code'),
        type: getValue('property_type')
      },
      financial: {
        purchase_price: getValue('purchase_price') || getValue('property_purchase_price'),
        closing_date: getValue('closing_date') || getValue('purchase_refinance_closing_date')
      },
      loan: {
        amount: getValue('loan_amount') || getValue('original_loan_amount'),
        number: getValue('loan_number') || getValue('loan_account_number'),
        interest_rate: getValue('interest_rate') || getValue('loan_interest_rate'),
        term_years: getValue('term_years') || getValue('loan_term_years'),
        monthly_payment: getValue('monthly_payment_principal_interest') || getValue('total_monthly_payment_piti')
      },
      taxes: {
        annual_amount: getValue('annual_taxes') || getValue('property_taxes') || getValue('escrow_property_tax')
      },
      insurance: {
        annual_premium: getValue('annual_premium') || getValue('insurance_annual_premium') || getValue('escrow_home_owner_insurance'),
        policy_number: getValue('policy_number') || getValue('insurance_policy_number'),
        effective_date: getValue('effective_date') || getValue('insurance_effective_date'),
        expiration_date: getValue('expiration_date') || getValue('insurance_expiration_date'),
        coverage_amount: getValue('coverage_amount') || getValue('coverage_a_dwelling') || getValue('dwelling_coverage'),
        deductible: getValue('deductible') || getValue('insurance_deductible')
      },
      lease: {
        monthly_rent: getValue('gross_monthly_income_rent') || getValue('monthly_rent')
      },
      borrower: {
        name: getValue('borrower_name') || getValue('owner_name') || getValue('buyer_name')
      },
      lender: {
        name: getValue('lender_name') || getValue('lender_mortgage_name') || getValue('mortgage_lender'),
        address: getValue('lender_mortgage_address') || getValue('lender_address'),
        phone: getValue('lender_mortgage_phone') || getValue('lender_phone'),
        contact_primary_name: getValue('lender_contact_primary_name'),
        contact_primary_phone: getValue('lender_contact_primary_phone'),
        contact_primary_fax: getValue('lender_contact_primary_fax'),
        contact_primary_email: getValue('lender_contact_primary_email'),
        contact_secondary_name: getValue('lender_contact_secondary_name'),
        contact_secondary_email: getValue('lender_contact_secondary_email'),
        counsel_name: getValue('lender_counsel_name'),
        counsel_address: getValue('lender_counsel_address'),
        counsel_phone: getValue('lender_counsel_phone'),
        counsel_fax: getValue('lender_counsel_fax'),
        counsel_email: getValue('lender_counsel_email')
      },
      owner: {
        name: getValue('owner_name') || getValue('borrower_name') || getValue('buyer_name'),
        address: getValue('owner_address') || getValue('owner_principal_address') || getValue('borrower_address'),
        principal_address: getValue('owner_principal_address') || getValue('owner_address') || getValue('borrower_address'),
        phone: getValue('owner_phone') || getValue('owner_phone_number') || getValue('borrower_phone'),
        phone_number: getValue('owner_phone_number') || getValue('owner_phone') || getValue('borrower_phone'),
        email: getValue('owner_email') || getValue('owner_email_address') || getValue('borrower_email'),
        email_address: getValue('owner_email_address') || getValue('owner_email') || getValue('borrower_email')
      },
      _documents: documents.map(doc => ({
        filename: doc.filename,
        type: doc.result.document_type,
        storage_path: doc.storage?.path,
        storage_url: doc.storage?.url
      }))
    };

    console.log('📤 Mapped data being sent to form:', mappedData);

    // Call callback with properly structured data
    if (onDataExtracted) {
      onDataExtracted(mappedData);
    }

    // Close modal and reset
    setShowModal(false);
    setDocuments([]);
    setProcessingStage('');
    setError(null);
  };

  const handleClose = () => {
    if (documents.length > 0 && !isProcessing) {
      const confirmed = window.confirm(
        `You have ${documents.length} document(s) processed. Do you want to copy the data to the form before closing?`
      );

      if (confirmed) {
        handleCopyToForm();
        return;
      }
    }

    setShowModal(false);
    setDocuments([]);
    setProcessingStage('');
    setError(null);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return '#22c55e';
    if (confidence >= 0.7) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <div className="ai-pdf-uploader">
        <label
          htmlFor="ai-pdf-upload"
          className="btn btn-primary"
          style={{
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            opacity: isProcessing ? 0.6 : 1
          }}
        >
          <i className="fas fa-magic"></i> Process with AI
        </label>
        <input
          id="ai-pdf-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />
      </div>

      {/* Processing Modal */}
      {showModal && (
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
            maxWidth: '1200px',
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, marginBottom: '8px', fontSize: '24px' }}>
                    🤖 AI Document Processor
                  </h2>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>
                    Document {documents.length}/{MAX_DOCUMENTS} | {isProcessing ? 'Processing...' : 'Ready'}
                  </div>
                </div>
                <button
                  onClick={handleClose}
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
              {/* Processing Status with Matrix Animation */}
              <div style={{
                position: 'relative',
                background: isProcessing ? '#000' : 'var(--panel-secondary)',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: isProcessing ? '1px solid #0F0' : '1px solid var(--border)',
                minHeight: '150px',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <MatrixBinaryRain isActive={isProcessing} />

                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  textAlign: 'center',
                  color: isProcessing ? '#0F0' : 'var(--accent-primary)'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    textShadow: isProcessing ? '0 0 10px #0F0' : 'none'
                  }}>
                    {processingStage || 'Ready to process documents'}
                  </div>

                  {isProcessing && (
                    <>
                      <div style={{
                        margin: '16px auto',
                        width: '80%',
                        maxWidth: '400px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '8px',
                        height: '24px',
                        overflow: 'hidden',
                        border: '1px solid #0F0',
                        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, #0F0, #00FF00)',
                          transition: 'width 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#000',
                          boxShadow: '0 0 10px #0F0'
                        }}>
                          {progress > 10 && `${progress}%`}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        opacity: 0.9,
                        color: '#0F0',
                        fontFamily: 'monospace',
                        textShadow: '0 0 5px #0F0'
                      }}>
                        [PROCESSING... 30-60 SECONDS]
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '2px solid var(--error)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  color: 'var(--error)'
                }}>
                  <i className="fas fa-exclamation-circle"></i> Error: {error}
                </div>
              )}

              {/* Expected Documents */}
              <div style={{
                background: 'var(--panel-secondary)',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                  Expected Documents ({documents.length}/{MAX_DOCUMENTS})
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {DOCUMENT_TYPES.map((type, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px 16px',
                        background: documents[index] ? 'rgba(34, 197, 94, 0.1)' : 'var(--panel-primary)',
                        border: `1px solid ${documents[index] ? '#22c55e' : 'var(--border)'}`,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: documents[index] ? '#22c55e' : 'var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {documents[index] ? '✓' : index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{type}</div>
                        {documents[index] && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {documents[index].filename}
                          </div>
                        )}
                      </div>
                      {documents[index] && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                          {Object.keys(documents[index].result.extracted_data || {}).length} fields
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Next Document Button */}
              {!isProcessing && documents.length > 0 && documents.length < MAX_DOCUMENTS && (
                <div style={{
                  background: 'var(--panel-secondary)',
                  border: '2px dashed var(--accent-primary)',
                  padding: '32px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Upload Next Document ({documents.length + 1}/{MAX_DOCUMENTS})
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Expected: {DOCUMENT_TYPES[documents.length]}
                  </div>
                  <label
                    htmlFor="ai-pdf-upload-next"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 32px',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '16px',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    <i className="fas fa-upload"></i> Upload {DOCUMENT_TYPES[documents.length]}
                  </label>
                  <input
                    id="ai-pdf-upload-next"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}

              {/* Processed Documents Details */}
              {documents.length > 0 && (
                <div style={{
                  background: 'var(--panel-secondary)',
                  padding: '24px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                    Processed Documents Details
                  </h3>

                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'var(--panel-primary)',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Document #{index + 1}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {doc.filename}
                          </div>
                          {doc.storage && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <i className="fas fa-cloud"></i> Saved to storage
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Type
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                            {doc.result.document_type.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Classification Confidence
                          </div>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: getConfidenceColor(doc.result.classification_confidence)
                          }}>
                            {(doc.result.classification_confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Fields Extracted
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {Object.keys(doc.result.extracted_data || {}).length}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Processing Time
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {(doc.result.processing?.duration_ms / 1000).toFixed(1)}s
                          </div>
                        </div>
                      </div>

                      {/* Key fields preview */}
                      {doc.result.extracted_data && (
                        <div style={{
                          marginTop: '16px',
                          padding: '12px',
                          background: 'var(--panel-secondary)',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            Key Fields:
                          </div>
                          <div style={{ display: 'grid', gap: '4px' }}>
                            {Object.entries(doc.result.extracted_data)
                              .filter(([field]) =>
                                field.includes('owner') ||
                                field.includes('property') ||
                                field.includes('address') ||
                                field.includes('loan')
                              )
                              .slice(0, 5)
                              .map(([field, data]) => (
                                <div key={field} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                                  <span style={{ opacity: 0.7 }}>{field}:</span>
                                  <span>{String(data.value).substring(0, 40)}{String(data.value).length > 40 ? '...' : ''}</span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Initial Instructions */}
              {!isProcessing && documents.length === 0 && (
                <div style={{
                  background: 'var(--panel-secondary)',
                  border: '1px solid var(--accent-primary)',
                  padding: '24px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Click "Process with AI" button to upload the first document
                    <br />
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      (Closing Statement, ALTA, Warranties, etc.)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '24px 32px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              background: 'var(--panel-secondary)'
            }}>
              {documents.length > 0 && (
                <button
                  onClick={handleCopyToForm}
                  disabled={isProcessing}
                  style={{
                    padding: '12px 32px',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    opacity: isProcessing ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-check"></i> Copy to Form ({documents.length} doc{documents.length > 1 ? 's' : ''})
                </button>
              )}
              <button
                onClick={handleClose}
                disabled={isProcessing}
                style={{
                  padding: '12px 32px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: isProcessing ? 0.5 : 1
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AIPDFUploader;
