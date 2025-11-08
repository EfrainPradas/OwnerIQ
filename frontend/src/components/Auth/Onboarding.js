import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import logo from '../../logo.png';
import './Onboarding.css';

function Onboarding({ setUser }) {
  const [activeStep, setActiveStep] = useState('welcome');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Auth data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile data
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        checkProfile(session.user);
      }
    }
    checkSession();
  }, []);

  const checkProfile = async (user) => {
    // Check if the user already has a profile in the person table
    const { data, error } = await supabase
      .from('person')
      .select('*')
      .eq('person_id', user.id)
      .single();

    if (error) {
      // No profile found, go to profile creation step
      setActiveStep('create-profile');
    } else {
      // Profile exists, complete the signin
      setUser({ ...user, ...data });
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirect: window.location.origin
        }
      });
      
      if (error) throw error;
      
      setMessage({
        text: 'Registration successful! Please check your email for verification link.',
        type: 'success'
      });
      setActiveStep('verify-email');
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Check if user has completed profile setup
      if (data?.user) {
        await checkProfile(data.user);
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ text: 'User not authenticated', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      // First, create the person record
      const { data: personData, error: personError } = await supabase
        .from('person')
        .insert({
          person_id: user.id,
          full_name: fullName,
          primary_email: email,
          primary_phone: phone,
          kind: 'individual' // Establecer explícitamente como 'individual' (no 'user')
        })
        .select()
        .single();

      if (personError) throw personError;

      // Then, add address if provided
      if (address && city && state && zipCode) {
        const { error: addressError } = await supabase
          .from('person_address')
          .insert({
            person_id: user.id,
            kind: 'home',
            line1: address,
            city,
            state_code: state,
            postal_code: zipCode,
            country_code: 'US',
            is_primary: true
          }); 
        
        if (addressError) throw addressError;
      }

      // Create a default investor profile
      const { error: profileError } = await supabase
        .from('investor_profile')
        .insert({
          person_id: user.id,
          kyc_status: 'pending',
          risk_tolerance: 'moderate'
        });
      
      if (profileError) throw profileError;

      setMessage({ text: 'Profile created successfully!', type: 'success' });
      setUser({ ...user, ...personData });
      
      // Wait a moment to show success message before redirecting
      setTimeout(() => {
        // The parent component will handle redirecting to the dashboard
        // when setUser is called with a valid user object
      }, 1500);
      
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      
      if (error) throw error;
      
      setMessage({
        text: 'Password reset instructions sent to your email',
        type: 'success'
      });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="onboarding-welcome">
      <div className="logo-container">
        <img src={logo} alt="OwnerIQ Logo" />
        <h1>OwnerIQ</h1>
      </div>
      <h2>Your property management solution</h2>
      <p>Manage your properties, tenants, mortgages, and more - all in one place.</p>
      
      <div className="welcome-buttons">
        <button 
          onClick={() => setActiveStep('sign-in')}
          className="btn btn-primary"
        >
          Sign In
        </button>
        <button 
          onClick={() => setActiveStep('sign-up')}
          className="btn btn-outline"
        >
          Create Account
        </button>
      </div>
      
      <div className="demo-mode">
        <button 
          onClick={() => {
            setEmail('demo@example.com');
            setPassword('demo123');
            handleSignIn({ preventDefault: () => {} });
          }}
          className="btn btn-text"
        >
          Try Demo Mode
        </button>
      </div>
    </div>
  );

  const renderSignUpStep = () => (
    <div className="onboarding-form">
      <h2>Create your account</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSignUp}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      
      <div className="form-footer">
        <p>Already have an account? <button onClick={() => setActiveStep('sign-in')} className="btn btn-text">Sign In</button></p>
      </div>
    </div>
  );

  const renderSignInStep = () => (
    <div className="onboarding-form">
      <h2>Sign in to your account</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSignIn}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <div className="form-footer">
        <button 
          onClick={() => setActiveStep('reset-password')} 
          className="btn btn-text"
        >
          Forgot password?
        </button>
        <p>Don't have an account? <button onClick={() => setActiveStep('sign-up')} className="btn btn-text">Sign Up</button></p>
      </div>
    </div>
  );

  const renderVerifyEmailStep = () => (
    <div className="onboarding-verify">
      <h2>Verify your email</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="email-icon">
        <i className="fas fa-envelope-open-text"></i>
      </div>
      
      <p>We've sent a verification link to <strong>{email}</strong></p>
      <p>Please check your email and click the verification link to continue.</p>
      
      <button 
        onClick={() => setActiveStep('sign-in')} 
        className="btn btn-primary"
      >
        Back to Sign In
      </button>
    </div>
  );

  const renderResetPasswordStep = () => (
    <div className="onboarding-form">
      <h2>Reset your password</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handlePasswordReset}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Instructions'}
        </button>
      </form>
      
      <div className="form-footer">
        <button onClick={() => setActiveStep('sign-in')} className="btn btn-text">Back to Sign In</button>
      </div>
    </div>
  );

  const renderCreateProfileStep = () => (
    <div className="onboarding-form profile-form">
      <h2>Complete your profile</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleCreateProfile}>
        <div className="form-section">
          <h3>Personal Information</h3>
          
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        
        <div className="form-section">
          <h3>Address (Optional)</h3>
          
          <div className="form-group">
            <label htmlFor="address">Street Address</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          
          <div className="address-grid">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code</label>
              <input
                id="zipCode"
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving profile...' : 'Complete Setup & Continue'}
        </button>
      </form>
    </div>
  );

  // Render the active step
  const renderStep = () => {
    switch (activeStep) {
      case 'welcome':
        return renderWelcomeStep();
      case 'sign-up':
        return renderSignUpStep();
      case 'sign-in':
        return renderSignInStep();
      case 'verify-email':
        return renderVerifyEmailStep();
      case 'reset-password':
        return renderResetPasswordStep();
      case 'create-profile':
        return renderCreateProfileStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {renderStep()}
      </div>
    </div>
  );
}

export default Onboarding;