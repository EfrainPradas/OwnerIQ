import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import '../Auth/ComprehensiveOnboarding.css';

const ComprehensiveOnboarding = ({ setUser, onboardingComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [userType, setUserType] = useState('');
  const [hasPrimaryResidence, setHasPrimaryResidence] = useState(false);
  const [investmentPropertyCount, setInvestmentPropertyCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userRegistered, setUserRegistered] = useState(false);

  // Form states
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    const session = await supabase.auth.session();
    if (session?.user) {
      setUser(session.user);
      // REMOVED: Auto-completing onboarding when user has session
      // This was causing the onboarding to close immediately
      // onboardingComplete && onboardingComplete();
    }
  };

  const validateStep = () => {
    setMessage({ text: '', type: '' });
    switch (currentStep) {
      case 1:
        if (!ownerName || !ownerEmail || !ownerPhone || !userType) {
          setMessage({ text: 'Por favor completa todos los campos requeridos', type: 'error' });
          return false;
        }
        if (userType === 'INVESTOR') {
          if (!hasPrimaryResidence && investmentPropertyCount === 0) {
            setMessage({ text: 'Como inversionista, debes tener al menos una residencia principal o propiedades de inversión', type: 'error' });
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: ownerEmail,
        password: 'temp123456', // Contraseña temporal para demo
        options: {
          emailRedirect: window.location.origin
        }
      });

      if (error) throw error;

      // Crear perfil de usuario con estado PENDING para continuar onboarding
      if (data?.user) {
        await createUserProfile(data.user, 'PENDING');
      } else {
        throw new Error('No se pudo obtener la información del usuario');
      }

      setUserRegistered(true);
      setMessage({
        text: 'Registro exitoso. Ahora completa los pasos del onboarding.',
        type: 'success'
      });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Update user profile to COMPLETED status
      const response = await fetch('http://localhost:5001/api/onboarding/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token',
          'x-demo-mode': 'true'
        },
        body: JSON.stringify({
          onboarding_status: 'COMPLETED'
        })
      });

      if (response.ok) {
        setMessage({ text: '¡Onboarding completado exitosamente!', type: 'success' });
        setTimeout(() => {
          onboardingComplete && onboardingComplete();
        }, 1000);
      } else {
        throw new Error('Error al completar onboarding');
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      // Login rápido para demostración
      const { data, error } = await supabase.auth.signIn({
        email: 'demo@owneriq.com',
        password: 'demo123456'
      });

      if (error) {
        // Si no existe, crearlo
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'demo@owneriq.com',
          password: 'demo123456'
        });

        if (signUpError) throw signUpError;
        if (signUpData?.user) {
          await createUserProfile(signUpData.user);
          setUser(signUpData.user);
        } else {
          throw new Error('No se pudo crear el usuario');
        }
      } else {
        if (data?.user) {
          setUser(data.user);
        } else {
          throw new Error('No se pudo obtener la información del usuario');
        }
      }

      onboardingComplete && onboardingComplete();
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ text: 'Error en el login rápido', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (user, status = 'PENDING') => {
    // Validar que el usuario exista antes de proceder
    if (!user) {
      throw new Error('Usuario no válido para crear perfil');
    }

    const response = await fetch('http://localhost:5001/api/onboarding/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token',
        'x-demo-mode': 'true'
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

    if (!response.ok) {
      console.error('Error creating user profile');
    }
  };

  const renderStep1 = () => (
    <div className="step-content">
      <h2>Paso 1: Información del Usuario</h2>

      <div className="form-section">
        <h3>Información Básica</h3>

        <div className="form-group">
          <label>Nombre Completo *</label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Ingresa tu nombre completo"
            required
          />
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="Ingresa tu email"
            required
          />
        </div>

        <div className="form-group">
          <label>Teléfono *</label>
          <input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="Ingresa tu teléfono"
            required
          />
        </div>

        <div className="form-group">
          <label>Tipo de Usuario *</label>
          <div className="radio-group">
            <div className={`radio-card ${userType === 'HOMEOWNER' ? 'selected' : ''}`} onClick={() => setUserType('HOMEOWNER')}>
              <div className="radio-icon">🏠</div>
              <h4>HOMEOWNER</h4>
              <p>Soy propietario de mi vivienda principal</p>
            </div>
            <div className={`radio-card ${userType === 'INVESTOR' ? 'selected' : ''}`} onClick={() => setUserType('INVESTOR')}>
              <div className="radio-icon">💼</div>
              <h4>INVESTOR</h4>
              <p>Soy inversionista inmobiliario</p>
            </div>
          </div>
        </div>
      </div>

      {userType === 'INVESTOR' && (
        <div className="form-section">
          <h3>Detalles de Inversión</h3>

          <div className="form-group">
            <label>¿Quieres registrar tu vivienda principal?</label>
            <div className="radio-group">
              <div className={`radio-card ${hasPrimaryResidence === true ? 'selected' : ''}`} onClick={() => setHasPrimaryResidence(true)}>
                <h4>SÍ</h4>
                <p>Quiero registrar mi vivienda principal</p>
              </div>
              <div className={`radio-card ${hasPrimaryResidence === false ? 'selected' : ''}`} onClick={() => setHasPrimaryResidence(false)}>
                <h4>NO</h4>
                <p>Solo quiero registrar propiedades de inversión</p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>¿Cuántas propiedades de inversión quieres registrar?</label>
            <input
              type="number"
              min="0"
              max="10"
              value={investmentPropertyCount}
              onChange={(e) => setInvestmentPropertyCount(parseInt(e.target.value) || 0)}
              placeholder="Número (0-10)"
            />
          </div>
        </div>
      )}

      <div className="demo-section">
        <h3>Acceso Rápido de Demostración</h3>
        <p>Para probar rápidamente la aplicación completa:</p>
        <button className="btn btn-outline" onClick={handleQuickLogin} disabled={loading}>
          {loading ? 'Cargando...' : '🚀 Iniciar Demo Rápida'}
        </button>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      default: return renderStep1();
    }
  };

  return (
    <div className="comprehensive-onboarding">
      <div className="onboarding-header">
        <div className="logo-container">
          <h1>🏢 OwnerIQ</h1>
        </div>
        <p className="header-subtitle">Plataforma de Inteligencia y Gestión de Propiedades</p>
      </div>

      <div className="onboarding-container">
        <div className="progress-bar">
          <div className="progress-step active">
            <div className="progress-circle">1</div>
            <span className="progress-label">Información</span>
          </div>
          <div className="progress-line" />
          <div className="progress-step">
            <div className="progress-circle">2</div>
            <span className="progress-label">Propiedades</span>
          </div>
          <div className="progress-line" />
          <div className="progress-step">
            <div className="progress-circle">3</div>
            <span className="progress-label">Documentos</span>
          </div>
          <div className="progress-line" />
          <div className="progress-step">
            <div className="progress-circle">4</div>
            <span className="progress-label">Completado</span>
          </div>
        </div>

        <div className="onboarding-card">
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSignUp}>
            {renderStep()}

            <div className="step-actions">
              {!userRegistered ? (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Procesando...' : 'Comenzar Onboarding'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={completeOnboarding}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Procesando...' : '✅ Completar Onboarding e ir al Dashboard'}
                  </button>
                  <p style={{ margin: '1rem 0', color: '#94a3b8', textAlign: 'center' }}>
                    ¡Registro completo! Has completado todos los pasos del onboarding.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveOnboarding;