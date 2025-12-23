import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ComprehensiveOnboarding from './components/Auth/ComprehensiveOnboarding';
import PropertyOverview from './components/PropertyCommandCenter/PropertyOverview';
import PortfolioDashboard from './components/InvestorPortfolio/PortfolioDashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('onboarding');
  const [currentPropertyId, setCurrentPropertyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setup Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setIsLoading(false);
        if (session?.user) {
          setCurrentView('dashboard');
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setCurrentView('dashboard');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePropertyCommandCenterNavigate = (view, propertyId) => {
    if (propertyId) {
      setCurrentPropertyId(propertyId);
    }
    setCurrentView(view);
  };

  const handlePortfolioNavigate = (view, params) => {
    if (view === 'property-details' && params) {
      setCurrentPropertyId(params);
      setCurrentView('property-command-center');
    } else {
      setCurrentView(view);
    }
  };

  const handleOnboardingComplete = () => {
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    if (currentView === 'onboarding') {
      return (
        <ComprehensiveOnboarding 
          setUser={setUser} 
          onboardingComplete={handleOnboardingComplete}
        />
      );
    }

    if (currentView === 'dashboard') {
      return (
        <div className="dashboard-container">
          <h1>🏠 OwnerIQ Dashboard</h1>
          <div className="dashboard-grid">
            <div className="dashboard-card" onClick={() => setCurrentView('portfolio')}>
              <h3>💼 Portfolio</h3>
              <p>View your complete portfolio analytics</p>
            </div>
            <div className="dashboard-card" onClick={() => setCurrentView('properties')}>
              <h3>🏠 Properties</h3>
              <p>Manage your properties</p>
            </div>
            <div className="dashboard-card" onClick={() => setCurrentView('property-command-center')}>
              <h3>📊 Property Command Center</h3>
              <p>Detailed property analytics</p>
            </div>
          </div>
        </div>
      );
    }

    if (currentView === 'portfolio') {
      return (
        <PortfolioDashboard 
          onNavigate={handlePortfolioNavigate}
        />
      );
    }

    if (currentView === 'property-command-center') {
      return (
        <PropertyOverview
          propertyId={currentPropertyId}
          onNavigate={handlePropertyCommandCenterNavigate}
        />
      );
    }

    return <div>View not implemented</div>;
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading OwnerIQ...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user && (
        <nav className="navbar">
          <div className="navbar-brand">
            <h2>🏢 OwnerIQ</h2>
          </div>
          <div className="navbar-menu">
            <button 
              className={currentView === 'dashboard' ? 'active' : ''}
              onClick={() => setCurrentView('dashboard')}
            >
              🏠 Dashboard
            </button>
            <button 
              className={currentView === 'portfolio' ? 'active' : ''}
              onClick={() => setCurrentView('portfolio')}
            >
              💼 Portfolio
            </button>
            <button 
              className={currentView === 'property-command-center' ? 'active' : ''}
              onClick={() => setCurrentView('property-command-center')}
            >
              📊 Properties
            </button>
          </div>
          <div className="navbar-user">
            <span>👤 {user.email}</span>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="logout-btn"
            >
              Logout
            </button>
          </div>
        </nav>
      )}
      
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
