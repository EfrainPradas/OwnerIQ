import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { API_BASE_URL } from '../../config';
import '../Auth/ComprehensiveOnboarding.css';

const ComprehensiveOnboarding = ({ setUser, onboardingComplete }) => {
  // Step & Navigation State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userRegistered, setUserRegistered] = useState(false);

  // Step 1: User Info State
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [userType, setUserType] = useState('');
  const [hasPrimaryResidence, setHasPrimaryResidence] = useState(false);
  const [investmentPropertyCount, setInvestmentPropertyCount] = useState(0);

  // Property Iteration State
  const [totalProperties, setTotalProperties] = useState(0);
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(1);
  const [currentPropertyType, setCurrentPropertyType] = useState(''); // 'primary' or 'investment'
  const [currentInvestmentIndex, setCurrentInvestmentIndex] = useState(1);
  const [propertiesData, setPropertiesData] = useState([]);

  // Step 2: Property Setup State
  const [refinanced, setRefinanced] = useState(null);
  const [hasCompany, setHasCompany] = useState(null); // 'YES' or 'NO'
  const [companyChoice, setCompanyChoice] = useState(''); // 'NEW' or companyId
  const [companies, setCompanies] = useState([]);
  const [newCompanyData, setNewCompanyData] = useState({ name: '', email: '', phone: '', ein: '' });

  // Step 3: Documents State
  const [documents, setDocuments] = useState([]);
  const [batchId, setBatchId] = useState(null);

  const baseDocuments = [
    { id: 'closing', name: 'Closing Statement', description: 'HUD-1 or final closing statement', required: true, status: 'missing' },
    { id: 'disclosure', name: 'Closing Disclosure', description: 'Final loan disclosure document', required: true, status: 'missing' },
    { id: 'mortgage', name: 'Mortgage Statement', description: 'Most recent mortgage statement', required: true, status: 'missing' },
    { id: 'insurance', name: 'Property Insurance', description: 'Homeowners insurance policy', required: true, status: 'missing' },
    { id: 'tax', name: 'Property Tax Bill', description: 'Latest property tax statement', required: true, status: 'missing' },
    { id: 'utilities', name: 'Utilities Bill', description: 'Recent utility bill (water, electric, or gas)', required: true, status: 'missing' },
    { id: 'warranty', name: 'Appliance Warranty', description: 'Warranty documents for appliances', required: true, status: 'missing' }
  ];

  useEffect(() => {
    checkAuthSession();
    // Initialize documents
    setDocuments(JSON.parse(JSON.stringify(baseDocuments)));
  }, []);

  // Ensure we have a default company choice if none exists
  useEffect(() => {
    if (currentStep === 2 && companies.length === 0 && !companyChoice) {
      setCompanyChoice('NEW');
    }
  }, [currentStep, companies, companyChoice]);

  const checkAuthSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      if (session.user.email) setOwnerEmail(session.user.email);

      // Load existing profile to resume progress
      try {
        const token = session.access_token;
        const response = await fetch(`${API_BASE_URL}/api/onboarding/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-demo-mode': 'false'
          }
        });
        if (response.ok) {
          const profile = await response.json();
          if (profile) {
            // Pre-fill fields
            setOwnerName(profile.owner_name || '');
            setOwnerPhone(profile.owner_phone || '');
            setUserType(profile.user_type || '');
            setHasPrimaryResidence(profile.has_primary_residence || false);
            setInvestmentPropertyCount(profile.investment_property_count || 0);

            const step = profile.current_step || 1;
            if (step > 1) {
              // Calculate property totals if we are resuming
              let total = 0;
              let firstType = '';
              if (profile.user_type === 'HOMEOWNER') {
                total = 1;
                firstType = 'primary';
              } else {
                total = (profile.has_primary_residence ? 1 : 0) + (profile.investment_property_count || 0);
                firstType = profile.has_primary_residence ? 'primary' : 'investment';
              }
              setTotalProperties(total);
              setCurrentPropertyType(firstType);
              setCurrentPropertyIndex(1); // Ideally, we would track exact property index in DB too

              // If resuming to step 3, generate batch ID immediately
              if (step === 3) {
                setBatchId(crypto.randomUUID());
              }

              setCurrentStep(step);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    }
  };

  const resetForNextProperty = () => {
    let nextDocs = JSON.parse(JSON.stringify(baseDocuments));
    if (userType === 'INVESTOR') {
      nextDocs.push({ id: 'appraisal', name: 'Property Appraisal', description: 'Professional appraisal report', required: true, status: 'missing' });
      nextDocs.push({ id: 'hoa', name: 'HOA Documents', description: 'Homeowners association bylaws and fees', required: false, status: 'missing' });
    }
    setDocuments(nextDocs);
    setRefinanced(null);
    setHasCompany(null);
    setCompanyChoice('');
    setNewCompanyData({ name: '', email: '', phone: '', ein: '' });
  };

  const validateStep = () => {
    setMessage({ text: '', type: '' });

    if (currentStep === 1) {
      if (!ownerName || !ownerEmail || !ownerPhone || !userType) {
        setMessage({ text: 'Please complete all required fields', type: 'error' });
        return false;
      }
      if (userType === 'INVESTOR') {
        if (!hasPrimaryResidence && investmentPropertyCount === 0) {
          setMessage({ text: 'As an investor, you must have at least a primary residence or investment properties', type: 'error' });
          return false;
        }
      }
      return true;
    }

    if (currentStep === 2) {
      if (refinanced === null) {
        setMessage({ text: 'Please answer the refinance question', type: 'error' });
        return false;
      }
      if (userType === 'INVESTOR' && currentPropertyType === 'investment') {
        if (hasCompany === null) {
          setMessage({ text: 'Please answer if the property is under a company', type: 'error' });
          return false;
        }
        if (hasCompany === 'YES') {
          if (!companyChoice) {
            setMessage({ text: 'Please select or create a company', type: 'error' });
            return false;
          }
          if (companyChoice === 'NEW') {
            if (!newCompanyData.name || !newCompanyData.email || !newCompanyData.phone || !newCompanyData.ein) {
              setMessage({ text: 'Please complete all company fields', type: 'error' });
              return false;
            }
          }
        }
      }
      return true;
    }

    if (currentStep === 3) {
      const missingRequired = documents.some(d => d.required && d.status === 'missing');
      if (missingRequired) {
        setMessage({ text: 'Please upload all required documents', type: 'error' });
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = async (e) => {
    if (e) e.preventDefault();

    if (!validateStep()) return;

    if (currentStep === 1) {
      // Register User first if not done
      if (!userRegistered) {
        await handleSignUp(); // This sends data to backend
        if (!userRegistered) return; // If failed, stop
      }

      // Calculate totals
      let total = 0;
      let firstType = '';
      if (userType === 'HOMEOWNER') {
        total = 1;
        firstType = 'primary';
      } else {
        total = (hasPrimaryResidence ? 1 : 0) + investmentPropertyCount;
        firstType = hasPrimaryResidence ? 'primary' : 'investment';
      }

      setTotalProperties(total);
      setCurrentPropertyType(firstType);
      setCurrentPropertyIndex(1);
      setCurrentInvestmentIndex(1);

      // Persist step 2 to backend
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/onboarding/profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-demo-mode': 'false'
            },
            body: JSON.stringify({ current_step: 2 })
          });
        } catch (err) {
          console.error('Failed to save step progress', err);
        }
      }

      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      // Save Step 2 data to local state
      let companyId = null;
      if (currentPropertyType === 'investment' && hasCompany === 'YES') {
        if (companyChoice === 'NEW') {
          const newId = companies.length;
          const newComp = { ...newCompanyData, id: newId };
          setCompanies([...companies, newComp]);
          companyId = newId;
        } else {
          companyId = companyChoice;
        }
      }

      // Update documents list for Step 3 based on user type
      let nextDocs = [...documents];
      // Reset logic handles base; check if we need to add investor docs if not already there
      if (userType === 'INVESTOR' && !documents.find(d => d.id === 'appraisal')) {
        nextDocs.push({ id: 'appraisal', name: 'Property Appraisal', description: 'Professional appraisal report', required: true, status: 'missing' });
        nextDocs.push({ id: 'hoa', name: 'HOA Documents', description: 'Homeowners association bylaws and fees', required: false, status: 'missing' });
      }
      setDocuments(nextDocs);

      // Create a batch ID for this property session
      setBatchId(crypto.randomUUID());

      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      // Save current property data
      const currentPropData = {
        index: currentPropertyIndex,
        type: currentPropertyType,
        refinanced,
        hasCompany,
        companyId: (currentPropertyType === 'investment' && hasCompany === 'YES' && companyChoice !== 'NEW') ? companyChoice : (companies.length - 1 < 0 ? null : companies.length - 1),
        documents: [...documents]
      };

      setPropertiesData([...propertiesData, currentPropData]);

      // Check if more properties
      if (currentPropertyIndex < totalProperties) {
        // Prepare for next property
        let nextType = currentPropertyType;
        let nextInvIndex = currentInvestmentIndex;

        if (currentPropertyType === 'primary') {
          nextType = 'investment';
          nextInvIndex = 1;
        } else {
          nextInvIndex++;
        }

        setCurrentPropertyIndex(currentPropertyIndex + 1);
        setCurrentPropertyType(nextType);
        setCurrentInvestmentIndex(nextInvIndex);

        resetForNextProperty();
        setCurrentStep(2);
      } else {
        // All done
        await completeOnboarding();
        setCurrentStep(4);
      }
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      let authUser = null;
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        authUser = session.user;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: ownerEmail,
          password: 'temp123456',
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        authUser = data.user;
      }

      if (authUser) {
        await createUserProfile(authUser, 'IN_PROGRESS');
        setUserRegistered(true);
      } else {
        throw new Error('No user info');
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (user, status = 'IN_PROGRESS') => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch(`${API_BASE_URL}/api/onboarding/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-demo-mode': 'false'
      },
      body: JSON.stringify({
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_phone: ownerPhone,
        user_type: userType,
        has_primary_residence: hasPrimaryResidence,
        investment_property_count: investmentPropertyCount,
        onboarding_status: status
      })
    });
    if (!response.ok) throw new Error('Failed to create profile');
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Update user profile to COMPLETED status
      const response = await fetch(`${API_BASE_URL}/api/onboarding/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-demo-mode': 'false'
        },
        body: JSON.stringify({
          onboarding_status: 'COMPLETED'
        })
      });

      if (!response.ok) throw new Error('Error completing onboarding');
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, docId) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // 1. Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];

        // 2. Get session
        const token = (await supabase.auth.getSession()).data.session?.access_token;

        // 3. Send to backend
        const response = await fetch(`${API_BASE_URL}/api/onboarding/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-demo-mode': 'false'
          },
          body: JSON.stringify({
            batch_id: batchId,
            doc_type_id: docId,
            filename: file.name,
            file_data: base64Data
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Upload failed');
        }

        const data = await response.json();
        console.log('✅ Upload success:', data);

        // 4. Update UI
        setDocuments(prevDocs => prevDocs.map(d => {
          if (d.id === docId) {
            return { ...d, status: 'uploaded' };
          }
          return d;
        }));

        setMessage({ text: 'File uploaded and AI processing started!', type: 'success' });
      };

    } catch (error) {
      console.error('Upload Error:', error);
      setMessage({ text: `Upload failed: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- Render Functions ---

  const renderStep1 = () => (
    <div className="step-content animate-fade-in">
      <h2 className="step-title" style={{ textAlign: 'center' }}>Let's get started 🚀</h2>
      {/* Info box removed for compactness */}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input type="text" className="form-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="John Doe" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone Number *</label>
          <input type="tel" className="form-input" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">I am a *</label>
        <div className="radio-group-row">
          <div className={`radio-option ${userType === 'HOMEOWNER' ? 'selected' : ''}`} onClick={() => setUserType('HOMEOWNER')}>
            <span>🏠 Homeowner</span>
          </div>
          <div className={`radio-option ${userType === 'INVESTOR' ? 'selected' : ''}`} onClick={() => setUserType('INVESTOR')}>
            <span>💼 Investor</span>
          </div>
        </div>
      </div>

      {userType === 'INVESTOR' && (
        <div className="form-row slide-down">
          <div className="form-group">
            <label className="form-label">Register Primary Residence?</label>
            <div className="radio-group-row" style={{ marginTop: '0.25rem' }}>
              <div className={`radio-option ${hasPrimaryResidence === true ? 'selected' : ''}`} onClick={() => setHasPrimaryResidence(true)}>Yes</div>
              <div className={`radio-option ${hasPrimaryResidence === false ? 'selected' : ''}`} onClick={() => setHasPrimaryResidence(false)}>No</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Properties to Onboard</label>
            <input type="number" className="form-input" value={investmentPropertyCount} onChange={(e) => setInvestmentPropertyCount(parseInt(e.target.value) || 0)} min="0" max="10" />
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="step-content animate-fade-in">
      <h2 className="step-title" style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
        {currentPropertyType === 'primary' ? 'Primary Residence Setup 🏠' : `Investment Property #${currentInvestmentIndex} Setup 🏢`}
      </h2>

      {/* Property Indicator if multiple */}
      {totalProperties > 1 && (
        <div className="property-indicator" style={{ marginBottom: '1rem', padding: '0.5rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>Property {currentPropertyIndex} of {totalProperties}</div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Have you refinanced this property? *</label>
        <div className="radio-group-row">
          <div className={`radio-option ${refinanced === 'YES' ? 'selected' : ''}`} onClick={() => setRefinanced('YES')}>✅ Yes</div>
          <div className={`radio-option ${refinanced === 'NO' ? 'selected' : ''}`} onClick={() => setRefinanced('NO')}>❌ No</div>
        </div>
      </div>

      {userType === 'INVESTOR' && currentPropertyType === 'investment' && (
        <div className="form-group slide-down">
          <label className="form-label">Is this property under a company? *</label>
          <div className="radio-group-row">
            <div className={`radio-option ${hasCompany === 'YES' ? 'selected' : ''}`} onClick={() => setHasCompany('YES')}>✅ Yes</div>
            <div className={`radio-option ${hasCompany === 'NO' ? 'selected' : ''}`} onClick={() => setHasCompany('NO')}>❌ No</div>
          </div>
        </div>
      )}

      {hasCompany === 'YES' && (
        <div className="company-section slide-down" style={{ marginTop: '1rem', padding: '1rem' }}>
          <div className="company-header" style={{ marginBottom: '0.5rem' }}><span>🏢</span><span>Company Details</span></div>

          {companies.length > 0 && (
            <div className="form-group">
              <label className="form-label">Select Company</label>
              {companies.map(c => (
                <div key={c.id} className={`radio-option ${companyChoice === c.id ? 'selected' : ''}`} onClick={() => setCompanyChoice(c.id)} style={{ marginBottom: '0.5rem', display: 'block', textAlign: 'left', padding: '0.5rem' }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                </div>
              ))}
              <div className={`radio-option ${companyChoice === 'NEW' ? 'selected' : ''}`} onClick={() => setCompanyChoice('NEW')} style={{ marginTop: '0.5rem', padding: '0.5rem' }}>➕ Create New</div>
            </div>
          )}

          {(companies.length === 0 || companyChoice === 'NEW') && (
            <div className="slide-down">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" value={newCompanyData.name} onChange={e => setNewCompanyData({ ...newCompanyData, name: e.target.value })} placeholder="LLC Name" /></div>
                <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-input" value={newCompanyData.email} onChange={e => setNewCompanyData({ ...newCompanyData, email: e.target.value })} placeholder="Email" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone *</label><input type="tel" className="form-input" value={newCompanyData.phone} onChange={e => setNewCompanyData({ ...newCompanyData, phone: e.target.value })} placeholder="Phone" /></div>
                <div className="form-group"><label className="form-label">EIN *</label><input type="text" className="form-input" value={newCompanyData.ein} onChange={e => setNewCompanyData({ ...newCompanyData, ein: e.target.value })} placeholder="EIN" /></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const toggleDocStatus = (id) => {
    setDocuments(documents.map(d => {
      if (d.id === id) {
        // Toggle status: missing -> uploaded -> validated -> missing
        let nextStatus = 'missing';
        if (d.status === 'missing') nextStatus = 'uploaded';
        else if (d.status === 'uploaded') nextStatus = 'validated';
        return { ...d, status: nextStatus };
      }
      return d;
    }));
  };

  const renderStep3 = () => {
    const requiredDocs = documents.filter(d => d.required);
    const uploadedCount = requiredDocs.filter(d => d.status !== 'missing').length;

    return (
      <div className="step-content animate-fade-in">
        <h2 className="step-title">Upload your documents 📄</h2>

        {totalProperties > 1 && (
          <div className="property-indicator">
            <div className="property-indicator-number">{currentPropertyIndex} <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>of</span> {totalProperties}</div>
            <div className="property-indicator-label">{currentPropertyType === 'primary' ? 'Primary Residence' : 'Investment Property'}</div>
          </div>
        )}

        <div className="info-box">
          <div className="info-box-title">⚠️ File Requirements</div>
          <div className="info-box-content">• Click on any document card to upload your PDF or image.<br />• Our system will process your documents in the background.<br />• Your property dashboard will be ready after a short review period.</div>
        </div>

        <div className="document-checklist">
          <div className="checklist-header">
            <div className="checklist-title">Required Documents</div>
            <div className="checklist-badge">{uploadedCount} / {requiredDocs.length}</div>
          </div>

          {requiredDocs.map(d => (
            <div key={d.id} className={`document-item ${d.status}`}>
              <div className="document-header" onClick={() => document.getElementById(`file-upload-${d.id}`)?.click()} style={{ cursor: d.status === 'missing' ? 'pointer' : 'default' }}>
                <div className="document-name">{d.name} <span className="required-badge">Required</span></div>
                <div className={`status-indicator status-${d.status}`}>
                  <div className="status-icon">{d.status === 'missing' ? '📋' : d.status === 'uploaded' ? '📤' : '✓'}</div>
                  {/* Simplification: Show "Uploaded" instead of "Processing..." to imply it's accepted for later review */}
                  <span>{d.status === 'missing' ? 'Missing' : d.status === 'uploaded' ? 'Received' : 'Validated'}</span>
                </div>
              </div>
              <div className="document-description">{d.description}</div>

              {/* Actual File Input */}
              <input
                type="file"
                id={`file-upload-${d.id}`}
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleFileUpload(e, d.id)}
                disabled={d.status !== 'missing'}
              />

              {d.status === 'missing' && (
                <div className="upload-zone" onClick={() => document.getElementById(`file-upload-${d.id}`)?.click()}>
                  <div className="upload-icon">📁</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Click to upload PDF or Image</div>
                </div>
              )}
            </div>
          ))}

          {documents.filter(d => !d.required).length > 0 && (
            <>
              <div className="checklist-header" style={{ marginTop: '2rem' }}>
                <div className="checklist-title">Optional Documents</div>
              </div>
              {documents.filter(d => !d.required).map(d => (
                <div key={d.id} className={`document-item ${d.status}`} onClick={() => toggleDocStatus(d.id)}>
                  <div className="document-header">
                    <div className="document-name">{d.name} <span className="optional-badge">Optional</span></div>
                    <div className={`status-indicator status-${d.status}`}>
                      <div className="status-icon">{d.status === 'missing' ? '📋' : d.status === 'uploaded' ? '📤' : '✓'}</div>
                      <span>{d.status === 'missing' ? 'Not uploaded' : d.status === 'uploaded' ? 'Uploaded' : 'Validated'}</span>
                    </div>
                  </div>
                  <div className="document-description">{d.description}</div>
                  {d.status === 'missing' && <div className="upload-zone"><div className="upload-icon">📁</div><div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Click to simulate upload</div></div>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="step-content success-screen">
      <div className="success-icon">🎉</div>
      <h2 className="success-title">All Set!</h2>
      <div className="success-message">
        Your property onboarding is complete. We're now processing your documents<br />and building your property intelligence dashboard.
      </div>
      <button className="btn btn-primary" onClick={() => onboardingComplete && onboardingComplete()}>
        Go to Dashboard
      </button>

      <div style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#06b6d4' }}>What's next?</h3>
        <div style={{ color: '#94a3b8', textAlign: 'left', maxWidth: '600px', margin: '0 auto', lineHeight: 1.8 }}>
          ✓ AI-powered document analysis (2-3 minutes)<br />
          ✓ Property value assessment<br />
          ✓ Risk & return analysis<br />
          ✓ Personalized insights & recommendations<br />
          ✓ Email notification when ready
        </div>
      </div>
    </div>
  );

  return (
    <div className="comprehensive-onboarding">
      <div className="onboarding-header">
        <div className="logo-container"><h1>🏢 OwnerIQ</h1></div>
        <p className="header-subtitle">Intelligent Property Management Platform</p>
      </div>

      <div className="onboarding-container">
        {currentStep < 4 && (
          <div className="progress-bar">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
              <div className="progress-circle">{currentStep > 1 ? '✓' : '1'}</div><span className="progress-label">Info</span>
            </div>
            <div className="progress-line"><div className="progress-fill" style={{ width: currentStep > 1 ? '100%' : '0%' }}></div></div>
            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
              <div className="progress-circle">{currentStep > 2 ? '✓' : '2'}</div><span className="progress-label">Setup</span>
            </div>
            <div className="progress-line"><div className="progress-fill" style={{ width: currentStep > 2 ? '100%' : '0%' }}></div></div>
            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
              <div className="progress-circle">{currentStep > 3 ? '✓' : '3'}</div><span className="progress-label">Docs</span>
            </div>
            <div className="progress-line"><div className="progress-fill" style={{ width: currentStep > 3 ? '100%' : '0%' }}></div></div>
            <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
              <div className="progress-circle">4</div><span className="progress-label">Done</span>
            </div>
          </div>
        )}

        <div className="onboarding-card">
          {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

          <form style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            {currentStep < 4 && (
              <div className="step-actions" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                {currentStep > 1 && <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(currentStep - 1)} disabled={loading}>← Previous</button>}
                <button type="button" className="btn btn-primary" onClick={handleNext} disabled={loading}>
                  {loading ? 'Processing...' : (currentStep === 3 ? (currentPropertyIndex < totalProperties ? 'Next Property →' : 'Complete Setup') : 'Continue →')}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveOnboarding;