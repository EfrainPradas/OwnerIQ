import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from 'chart.js';

import { supabase } from './supabaseClient';
import './App.css';
import logo from './logo.png';
import Onboarding from './components/Auth/Onboarding';
import ComprehensiveOnboarding from './components/Auth/ComprehensiveOnboarding';
import LoginScreen from './components/Auth/LoginScreen';
import PropertiesView from './views/PropertiesView';
import ClientsView from './components/Clients/ClientsView';
import MortgageCalculator from './views/MortgageCalculator';
import PropertyOverview from './components/PropertyCommandCenter/PropertyOverview';
import MortgageDetails from './components/PropertyCommandCenter/MortgageDetails';
import AdminView from './views/AdminView';

import Taxes from './components/PropertyCommandCenter/Taxes';
import Insurance from './components/PropertyCommandCenter/Insurance';
import Utilities from './components/PropertyCommandCenter/Utilities';
import Appliances from './components/PropertyCommandCenter/Appliances';
import Documents from './components/PropertyCommandCenter/Documents';
import PortfolioDashboard from './components/InvestorPortfolio/PortfolioDashboard';
import OwnershipStructure from './components/InvestorPortfolio/OwnershipStructure';
import EntityDetails from './components/InvestorPortfolio/EntityDetails';
import DashboardView from './views/DashboardView';
import { API_BASE_URL, ENABLE_DEMO_MODE } from './config';

/* eslint-disable no-undef */

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentPropertyId, setCurrentPropertyId] = useState(null);
  const [currentEntityId, setCurrentEntityId] = useState(null);
  const [useComprehensiveOnboarding, setUseComprehensiveOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [forceOnboarding, setForceOnboarding] = useState(false); // New state to force onboarding

  // Sync currentView with URL
  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard';
    setCurrentView(path);
  }, [location.pathname]);

  // Initialize auth state from Supabase
  // Initialize auth state from Supabase
  useEffect(() => {
    // Setup Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (_event === 'SIGNED_OUT') {
        setUser(null);
        setOnboardingCompleted(false);
        navigate('/dashboard');
      }
      setIsLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Validate that this user actually exists in Auth service
        const { data: { user: validatedUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !validatedUser) {
          console.log('⚠️ Stale session detected, signing out...');
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return;
        }

        setUser(session.user ?? null);

        // Check if user has completed onboarding
        try {
          const { access_token } = session;
          const response = await fetch('http://localhost:5001/api/onboarding/profile', {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'x-demo-mode': 'false'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('🔍 Onboarding response:', data);
            const completed = data.onboarding_status === 'COMPLETED';
            console.log('🔍 onboarding_status:', data.onboarding_status);
            console.log('🔍 Setting onboardingCompleted to:', completed);
            setOnboardingCompleted(completed);
          }
        } catch (error) {
          console.log('Could not check onboarding status:', error);
          setOnboardingCompleted(false);
        }
        setIsLoading(false);
      } else {
        // No session - set loading to false immediately
        setIsLoading(false);
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Handle logout - properly defined in App component scope
  const appHandleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        // Restablecer el estado de la aplicación
        setUser(null);
        setOnboardingCompleted(false);
        navigate('/dashboard');
      } else {
        console.error('Error signing out:', error);
      }
    }
  };

  console.log('🎨 RENDER - user:', !!user, 'isLoading:', isLoading, 'onboardingCompleted:', onboardingCompleted);

  return (
    <div className="App">
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="loading">
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '48px', color: 'var(--accent-primary)' }}></i>
            <p>Loading...</p>
          </div>
        </div>
      ) : !user ? (
        <LoginScreen
          setUser={setUser}
        />
      ) : !onboardingCompleted ? (
        <ComprehensiveOnboarding
          setUser={setUser}
          onboardingComplete={() => {
            setOnboardingCompleted(true);
            setForceOnboarding(false);
            navigate('/dashboard');
          }}
        />
      ) : (
        <div>
          <div style={{ display: 'flex', background: 'var(--panel-primary)', padding: '15px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <h2
                style={{
                  margin: 0,
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <img
                  src={logo}
                  alt="OwnerIQ Logo"
                  style={{ height: '120px', marginRight: '15px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
                OwnerIQ
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {['dashboard', 'portfolio', 'properties', 'clients', 'calculator', 'reports', 'settings'].map(view => (
                <button
                  key={view}
                  onClick={() => navigate(`/${view}`)}
                  style={{
                    padding: '8px 12px',
                    background: currentView === view ? 'var(--accent-primary)' : 'transparent',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {view === 'dashboard' ? '📊 Dashboard' :
                    view === 'portfolio' ? '💼 Portfolio' :
                      view === 'properties' ? '🏠 Properties' :
                        view === 'clients' ? '👥 Clients' :
                          view === 'calculator' ? '🧮 Calculator' :
                            view === 'reports' ? '📈 Reports' :
                              view === 'settings' ? '⚙️ Settings' :
                                view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
              <button
                onClick={() => navigate('/admin')}
                style={{
                  padding: '8px 12px',
                  background: currentView === 'admin' ? 'var(--accent-primary)' : 'rgba(239, 68, 68, 0.1)',
                  color: currentView === 'admin' ? 'white' : '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔐 Admin
              </button>
              <button
                onClick={() => setUseComprehensiveOnboarding(!useComprehensiveOnboarding)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#06b6d4',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {useComprehensiveOnboarding ? '🔄 Simple Onboarding' : '🚀 Comprehensive Onboarding'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('⚠️ Are you sure you want to force restart the onboarding process? This will reset your onboarding status.')) {
                    setForceOnboarding(true);
                    setOnboardingCompleted(false);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                🔄 Force Onboarding
              </button>
            </div>
          </div>
          <MainContent
            user={user}
            setUser={setUser}
            properties={properties}
            setProperties={setProperties}
            currentView={currentView}
            setCurrentView={setCurrentView}
            currentPropertyId={currentPropertyId}
            setCurrentPropertyId={setCurrentPropertyId}
            appHandleLogout={appHandleLogout}
          />
        </div>
      )}
    </div>
  );
}

// Authentication & User Management moved to Onboarding.js

// eslint-disable-next-line no-undef
function MainContent({ user, setUser, properties, setProperties, currentView, setCurrentView, currentPropertyId, setCurrentPropertyId, appHandleLogout }) {
  const navigate = useNavigate();

  const handlePropertyCommandCenterNavigate = (view, propertyId) => {
    if (propertyId) {
      setCurrentPropertyId(propertyId);
    }
    navigate(`/${view}`);
  };

  const handlePortfolioNavigate = (view, params) => {
    if (view === 'property-details' && params) {
      setCurrentPropertyId(params);
      navigate('/property-command-center');
    } else if (view === 'entity-details' && params) {
      setCurrentEntityId(params);
      navigate(`/${view}`);
    } else {
      navigate(`/${view}`);
    }
  };

  const renderContent = () => {
    if (currentView === 'dashboard') {
      return (
        <DashboardView
          properties={properties}
        />
      );
    } else if (currentView === 'properties') {
      return <PropertiesView user={user} properties={properties} setProperties={setProperties} />;
    } else if (currentView === 'clients') {
      return <ClientsView />;
    } else if (currentView === 'calculator') {
      return <MortgageCalculator />;
    } else if (currentView === 'admin') {
      return <AdminView />;
    } else if (currentView === 'portfolio') {
      return <PortfolioDashboard onNavigate={handlePortfolioNavigate} />;
    } else if (currentView === 'property-command-center') {
      return (
        <div className="container">
          <PropertyOverview
            propertyId={currentPropertyId || (properties[0]?.property_id)}
            onNavigate={handlePropertyCommandCenterNavigate}
          />
        </div>
      );
    } else if (currentView === 'mortgage-details') {
      return (
        <div className="container">
          <MortgageDetails
            propertyId={currentPropertyId || (properties[0]?.property_id)}
            onNavigate={handlePropertyCommandCenterNavigate}
          />
        </div>
      );
    } else if (currentView === 'taxes') {
      return (
        <div className="container">
          <Taxes
            propertyId={currentPropertyId || (properties[0]?.property_id)}
            onNavigate={handlePropertyCommandCenterNavigate}
          />
        </div>
      );
    } else if (currentView === 'insurance') {
      return (
        <div className="container">
          <Insurance
            propertyId={currentPropertyId || (properties[0]?.property_id)}
            onNavigate={handlePropertyCommandCenterNavigate}
          />
        </div>
      );
    } else if (currentView === 'utilities') {
      return (
        <div className="container">
          <Utilities
            propertyId={currentPropertyId || (properties[0]?.property_id)}
            onNavigate={handlePropertyCommandCenterNavigate}
          />
        </div>
      );
    } else if (currentView === 'appliances') {
      return (
        <div className="container">
          <Appliances
            propertyId={currentPropertyId || (properties[0]?.property_id)}
            onNavigate={handlePropertyCommandCenterNavigate}
          />
        </div>
      );
    } else if (currentView === 'documents') {
      return (
        <div className="container">
          <Documents
            propertyId={currentPropertyId || (properties[0]?.property_id)}
            onNavigate={handlePropertyCommandCenterNavigate}
          />
        </div>
      );
    } else if (currentView === 'ownership') {
      return <OwnershipStructure onNavigate={handlePortfolioNavigate} />;
    } else if (currentView === 'entity-details') {
      return <EntityDetails entityId={currentEntityId} onNavigate={handlePortfolioNavigate} />;
    } else if (currentView === 'reports') {
      return <div className="container"><h1>Reports</h1><p>Reports feature coming soon...</p></div>;
    } else if (currentView === 'settings') {
      return <div className="container"><h1>Settings</h1><button onClick={appHandleLogout}>Log Out</button></div>;
    } else {
      return <div className="container"><h1>Dashboard</h1></div>;
    }
  };

  return (
    <div style={{
      marginLeft: window.innerWidth > 1024 ? '250px' : '0',
      width: window.innerWidth > 1024 ? 'calc(100% - 250px)' : '100%',
      transition: 'all 0.3s ease'
    }}>
      {renderContent()}
    </div>
  );
}



function ReportsView() {
  return (
    <div className="container">
      <h1>Reports & Analytics</h1>
      <p>Generate portfolio reports and analytics.</p>
      <div className="card">
        <p>Report generation features coming soon.</p>
      </div>
    </div>
  );
}

function SettingsView({ setUser, handleLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState({
    notifications: true,
    darkModeDefault: true,
    sessionTimeout: 30,
    language: 'en'
  });

  const handleSettingsChange = (setting, value) => {
    setSettings({ ...settings, [setting]: value });
  };

  return (
    <div className="container">
      <div className="header" style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--accent-primary)' }}>
          Settings
          <span style={{ fontSize: '18px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '10px' }}>
            Configure your application preferences
          </span>
        </h1>
      </div>

      <div style={{ display: 'flex', marginBottom: '30px' }}>
        <div style={{
          width: '250px',
          marginRight: '30px',
          background: 'var(--panel-secondary)',
          borderRadius: 'var(--border-radius)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {[
            { id: 'profile', label: 'User Profile', icon: 'user' },
            { id: 'appearance', label: 'Appearance', icon: 'palette' },
            { id: 'notifications', label: 'Notifications', icon: 'bell' },
            { id: 'security', label: 'Security', icon: 'shield-alt' },
            { id: 'language', label: 'Language', icon: 'language' }
          ].map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '15px 20px',
                borderLeft: activeTab === tab.id ? '4px solid var(--accent-primary)' : '4px solid transparent',
                background: activeTab === tab.id ? 'var(--panel-primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`fas fa-${tab.icon}`} style={{ width: '20px', textAlign: 'center' }}></i>
              <span style={{ fontWeight: activeTab === tab.id ? '600' : '400' }}>{tab.label}</span>
            </div>
          ))}

          {/* Separador */}
          <div style={{
            margin: '15px 20px',
            borderTop: '1px solid var(--border)',
            flex: 1
          }}></div>

          {/* BotÃ³n de Logout */}
          <div
            onClick={onLogout}
            style={{
              padding: '15px 20px',
              background: 'transparent',
              color: 'var(--error)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              marginBottom: '15px'
            }}
          >
            <i className="fas fa-sign-out-alt" style={{ width: '20px', textAlign: 'center' }}></i>
            <span style={{ fontWeight: '600' }}>Logout</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {activeTab === 'profile' && <ProfileView />}

          {activeTab === 'appearance' && (
            <div className="card" style={{ padding: '25px' }}>
              <div style={{
                borderBottom: '1px solid var(--border)',
                paddingBottom: '15px',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className="fas fa-palette" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}></i>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Appearance Settings</h2>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: 'var(--panel-secondary)',
                  borderRadius: 'var(--border-radius)',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Default to Dark Mode</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                      Start the application in dark mode by default
                    </p>
                  </div>
                  <label className="switch" style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '60px',
                    height: '34px'
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.darkModeDefault}
                      onChange={e => handleSettingsChange('darkModeDefault', e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: settings.darkModeDefault ? 'var(--accent-primary)' : '#ccc',
                      transition: '.4s',
                      borderRadius: '34px',
                      '&:before': {
                        position: 'absolute',
                        content: '',
                        height: '26px',
                        width: '26px',
                        left: '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        transition: '.4s',
                        borderRadius: '50%',
                        transform: settings.darkModeDefault ? 'translateX(26px)' : 'translateX(0)'
                      }
                    }}></span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}>
                  Color Scheme
                </label>
                <div style={{ display: 'flex', gap: '15px' }}>
                  {['Default', 'Blue', 'Green', 'Purple'].map(scheme => (
                    <div
                      key={scheme}
                      style={{
                        padding: '12px 20px',
                        background: 'var(--panel-secondary)',
                        borderRadius: 'var(--border-radius)',
                        cursor: 'pointer',
                        border: scheme === 'Default' ? '2px solid var(--accent-primary)' : '2px solid transparent'
                      }}
                    >
                      {scheme}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card" style={{ padding: '25px' }}>
              <div style={{
                borderBottom: '1px solid var(--border)',
                paddingBottom: '15px',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className="fas fa-bell" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}></i>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Notification Preferences</h2>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: 'var(--panel-secondary)',
                  borderRadius: 'var(--border-radius)',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Email Notifications</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                      Receive important notifications via email
                    </p>
                  </div>
                  <label className="switch" style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '60px',
                    height: '34px'
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={e => handleSettingsChange('notifications', e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: settings.notifications ? 'var(--accent-primary)' : '#ccc',
                      transition: '.4s',
                      borderRadius: '34px',
                      '&:before': {
                        position: 'absolute',
                        content: '',
                        height: '26px',
                        width: '26px',
                        left: '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        transition: '.4s',
                        borderRadius: '50%',
                        transform: settings.notifications ? 'translateX(26px)' : 'translateX(0)'
                      }
                    }}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card" style={{ padding: '25px' }}>
              <div style={{
                borderBottom: '1px solid var(--border)',
                paddingBottom: '15px',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className="fas fa-shield-alt" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}></i>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Security Settings</h2>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}>
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={e => handleSettingsChange('sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="120"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    marginBottom: '5px'
                  }}
                />
                <small style={{ color: 'var(--text-muted)' }}>
                  Automatically log out after this period of inactivity
                </small>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                <button
                  style={{
                    padding: '14px 24px',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-key"></i> Change Password
                </button>

                {/* BotÃ³n de Logout en la secciÃ³n de seguridad */}
                <button
                  onClick={onLogout}
                  style={{
                    padding: '14px 24px',
                    background: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="card" style={{ padding: '25px' }}>
              <div style={{
                borderBottom: '1px solid var(--border)',
                paddingBottom: '15px',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className="fas fa-language" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}></i>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Language Settings</h2>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}>
                  Application Language
                </label>
                <select
                  value={settings.language}
                  onChange={e => handleSettingsChange('language', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                >
                  <option value="en">English</option>
                  <option value="es">EspaÃ±ol</option>
                  <option value="fr">FranÃ§ais</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div >
    </div >
  );
}


function ProfileView() {
  const [profile, setProfile] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({
    line1: '',
    city: '',
    state_code: '',
    postal_code: '',
    is_primary: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      // Use Supabase to get user profile
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Get profile data from person table
        const { data: profileData, error: profileError } = await supabase
          .from('person')
          .select('*')
          .eq('person_id', user.id)
          .eq('kind', 'individual')
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching person profile:', profileError);
          setErrorMessage('Error loading profile data');
        } else {
          setProfile(profileData || {
            user_id: user.id,
            full_name: user.user_metadata?.full_name || '',
            primary_email: user.email,
            primary_phone: user.user_metadata?.phone || ''
          });
        }

        // Get addresses from person_address table
        const { data: addressData, error: addressError } = await supabase
          .from('person_address')
          .select('*')
          .eq('person_id', user.id)
          .order('is_primary', { ascending: false });

        if (addressError) {
          console.error('Error fetching person_addresses:', addressError);
          setErrorMessage('Error loading address data');
        } else {
          setAddresses(addressData || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error loading profile data. Please ensure you are logged in and the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Update auth metadata (name, phone)
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            full_name: profile.full_name,
            phone: profile.primary_phone
          }
        });

        if (metadataError) {
          console.error('Error updating user metadata:', metadataError);
          setErrorMessage('Error updating profile metadata');
          return;
        }

        // Check if profile exists and upsert to person table
        const { error: profileError } = await supabase
          .from('person')
          .upsert({
            person_id: user.id,
            full_name: profile.full_name,
            primary_email: profile.primary_email,
            primary_phone: profile.primary_phone,
            kind: 'individual'
          });

        if (profileError) {
          console.error('Error updating person profile:', profileError);
          setErrorMessage('Error updating profile information');
        } else {
          setSuccessMessage('Profile updated successfully');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error updating profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (editingAddressId) {
          // Update existing address in person_address table
          const { error } = await supabase
            .from('person_address')
            .update({
              line1: newAddress.line1,
              line2: newAddress.line2 || null,
              city: newAddress.city,
              state_code: newAddress.state_code,
              postal_code: newAddress.postal_code,
              is_primary: newAddress.is_primary ? true : false
            })
            .eq('address_id', editingAddressId);

          if (error) {
            console.error('Error updating person_address:', error);
            setErrorMessage('Error updating address');
          } else {
            // If setting as primary, update other addresses
            if (newAddress.is_primary) {
              await supabase
                .from('person_address')
                .update({ is_primary: false })
                .eq('person_id', user.id)
                .neq('address_id', editingAddressId);
            }

            setSuccessMessage('Address updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchProfileData();
            resetAddressForm();
          }
        } else {
          // Create new address in person_address table
          const { error } = await supabase
            .from('person_address')
            .insert({
              person_id: user.id,
              line1: newAddress.line1,
              line2: newAddress.line2 || null,
              city: newAddress.city,
              state_code: newAddress.state_code,
              postal_code: newAddress.postal_code,
              is_primary: newAddress.is_primary ? true : false
            });

          if (error) {
            console.error('Error creating person_address:', error);
            setErrorMessage('Error adding address');
          } else {
            // If setting as primary, update other addresses
            if (newAddress.is_primary) {
              // Actualizar todas las otras direcciones para quitar marca de principal
              await supabase
                .from('person_address')
                .update({ is_primary: false })
                .eq('person_id', user.id);

              // Luego intentar de nuevo con la direcciÃ³n reciÃ©n creada
              const { data: newAddressData } = await supabase
                .from('person_address')
                .select('*')
                .eq('person_id', user.id)
                .eq('line1', newAddress.line1)
                .single();

              if (newAddressData) {
                // Actualizamos la direcciÃ³n reciÃ©n creada para marcarla como principal
                await supabase
                  .from('person_address')
                  .update({ is_primary: true })
                  .eq('address_id', newAddressData.address_id);
              }
            }

            setSuccessMessage('Address added successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchProfileData();
            resetAddressForm();
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error saving address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('person_address')
        .delete()
        .eq('address_id', addressId);

      if (error) {
        console.error('Error deleting person_address:', error);
        setErrorMessage('Error deleting address');
      } else {
        setSuccessMessage('Address deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchProfileData();
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error deleting address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const editAddress = (address) => {
    setNewAddress({
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state_code: address.state_code || '',
      postal_code: address.postal_code || '',
      is_primary: address.is_primary || false
    });
    setEditingAddressId(address.address_id);
    setShowAddressForm(true);
  };

  const resetAddressForm = () => {
    setNewAddress({
      line1: '',
      line2: '',
      city: '',
      state_code: '',
      postal_code: '',
      is_primary: false
    });
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '48px', color: 'var(--accent-primary)', marginBottom: '20px' }}></i>
          <p style={{ color: 'var(--text-muted)' }}>Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header" style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--accent-primary)' }}>
          User Profile
          <span style={{ fontSize: '18px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '10px' }}>
            Manage your personal information
          </span>
        </h1>
      </div>

      {successMessage && (
        <div style={{
          padding: '16px',
          marginBottom: '20px',
          backgroundColor: 'rgba(34,197,94,0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid var(--success)',
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className="fas fa-check-circle" style={{ fontSize: '20px' }}></i>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '16px',
          marginBottom: '20px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid var(--error)',
          color: 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className="fas fa-exclamation-circle" style={{ fontSize: '20px' }}></i>
          {errorMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Personal Information Section */}
        <div className="card" style={{ padding: '25px' }}>
          <div style={{
            borderBottom: '1px solid var(--border)',
            paddingBottom: '15px',
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="fas fa-user" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}></i>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Personal Information</h2>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'var(--text-secondary)'
              }}>
                Full Name
              </label>
              <input
                placeholder="Your full name"
                value={profile.full_name || ''}
                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'var(--text-secondary)'
              }}>
                Email Address
              </label>
              <input
                placeholder="Your email address"
                type="email"
                value={profile.primary_email || ''}
                onChange={e => setProfile({ ...profile, primary_email: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '16px'
                }}
              />
              <small style={{ color: 'var(--text-muted)', marginTop: '5px', display: 'block' }}>
                Changing email may require verification
              </small>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'var(--text-secondary)'
              }}>
                Phone Number
              </label>
              <input
                placeholder="Your phone number"
                value={profile.primary_phone || ''}
                onChange={e => setProfile({ ...profile, primary_phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '16px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '14px 24px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                marginTop: '10px'
              }}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i> Updating...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Addresses Section */}
        <div className="card" style={{ padding: '25px' }}>
          <div style={{
            borderBottom: '1px solid var(--border)',
            paddingBottom: '15px',
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-map-marker-alt" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}></i>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Addresses</h2>
            </div>

            <button
              type="button"
              onClick={() => {
                resetAddressForm();
                setShowAddressForm(!showAddressForm);
              }}
              style={{
                padding: '8px 16px',
                background: showAddressForm ? 'var(--panel-secondary)' : 'var(--accent-primary)',
                color: showAddressForm ? 'var(--text-primary)' : 'white',
                border: showAddressForm ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--border-radius)',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {showAddressForm ? (
                <>
                  <i className="fas fa-times"></i> Cancel
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i> Add Address
                </>
              )}
            </button>
          </div>

          {/* Address Form */}
          {showAddressForm && (
            <form onSubmit={handleAddressSubmit} style={{ marginBottom: '25px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}>
                  Street Address
                </label>
                <input
                  placeholder="Street address"
                  value={newAddress.line1 || ''}
                  onChange={e => setNewAddress({ ...newAddress, line1: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    marginBottom: '10px'
                  }}
                />
                <input
                  placeholder="Apt, suite, unit, building (optional)"
                  value={newAddress.line2 || ''}
                  onChange={e => setNewAddress({ ...newAddress, line2: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)'
                  }}>
                    City
                  </label>
                  <input
                    placeholder="City"
                    value={newAddress.city || ''}
                    onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--panel-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)'
                  }}>
                    State
                  </label>
                  <input
                    placeholder="State code (e.g. CA)"
                    value={newAddress.state_code || ''}
                    onChange={e => setNewAddress({ ...newAddress, state_code: e.target.value })}
                    required
                    maxLength={2}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--panel-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}>
                  Postal Code
                </label>
                <input
                  placeholder="Postal code"
                  value={newAddress.postal_code || ''}
                  onChange={e => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}>
                  <input
                    type="checkbox"
                    checked={newAddress.is_primary || false}
                    onChange={e => setNewAddress({ ...newAddress, is_primary: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  Set as primary address
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className={editingAddressId ? "fas fa-edit" : "fas fa-plus"}></i>
                      {editingAddressId ? 'Update Address' : 'Add Address'}
                    </>
                  )}
                </button>

                {editingAddressId && (
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    disabled={isSubmitting}
                    style={{
                      padding: '14px 24px',
                      background: 'var(--panel-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--border-radius)',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Address List */}
          {addresses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px',
              color: 'var(--text-muted)',
              background: 'var(--panel-secondary)',
              borderRadius: 'var(--border-radius)',
              marginTop: showAddressForm ? '0' : '20px'
            }}>
              <i className="fas fa-map-marker-alt" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <p>No addresses found</p>
              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer'
                  }}
                >
                  Add Address
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              {addresses.map(address => (
                <div
                  key={address.address_id}
                  style={{
                    padding: '16px',
                    background: 'var(--panel-secondary)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border)',
                    position: 'relative'
                  }}
                >
                  {address.is_primary && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(34,197,94,0.1)',
                      color: 'var(--success)',
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      Primary
                    </div>
                  )}

                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                    {address.line1}
                    {address.line2 && <span style={{ display: 'block' }}>{address.line2}</span>}
                  </div>

                  <div style={{ color: 'var(--text-muted)' }}>
                    {address.city}, {address.state_code} {address.postal_code}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '10px',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '10px'
                  }}>
                    <button
                      onClick={() => editAddress(address)}
                      disabled={isSubmitting}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>

                    <button
                      onClick={() => handleDeleteAddress(address.address_id)}
                      disabled={isSubmitting || address.is_primary}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: address.is_primary ? 'var(--text-muted)' : 'var(--error)',
                        cursor: isSubmitting || address.is_primary ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '14px',
                        opacity: address.is_primary ? 0.5 : 1
                      }}
                    >
                      <i className="fas fa-trash-alt"></i> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


const AppWithRouter = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default AppWithRouter;
