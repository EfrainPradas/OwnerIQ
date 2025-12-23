import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import './LoginScreen.css';

const LoginScreen = ({ setUser }) => {
  console.log('🔍 LoginScreen render - props:', { setUser: !!setUser });
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔍 Submitting form, isLogin:', isLogin);
    setLoading(true);
    setMessage({ text: '', type: '' });

    // Validate passwords match for registration
    if (!isLogin && password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Login - Supabase v2
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setUser(data.user);

        // Check if user has completed onboarding
        try {
          const response = await fetch('http://localhost:5001/api/onboarding/profile', {
            headers: {
              'Authorization': `Bearer dummy-token`,
              'x-demo-mode': 'true'
            }
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('🔍 Login response:', userData);
            console.log('🔍 Onboarding status:', userData.onboarding_status);
            if (userData.onboarding_status === 'COMPLETED') {
              // User completed onboarding, go to dashboard
              setUser(data.user);
              // Don't call onStartOnboarding, let App.js handle showing dashboard
            } else {
              // User exists but hasn't completed onboarding
              console.log('🔍 User needs onboarding');
              setUser(data.user);
            }
          } else {
            // Profile doesn't exist, user needs onboarding
            console.log('🔍 No profile found, user needs onboarding');
            setUser(data.user);
          }
        } catch (error) {
          console.log('🔍 Error checking onboarding status:', error);
          setUser(data.user);
        }
      } else {
        // Register - Supabase v2
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (error) throw error;

        // Show email verification message
        setMessage({
          text: 'Account created successfully! Please check your email and click the verification link before signing in.',
          type: 'success'
        });

        // Don't set user or start onboarding yet - wait for email verification
        // User remains logged out until email is verified
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-container">
            <h1>🏢 OwnerIQ</h1>
          </div>
          <p className="header-subtitle">Property Intelligence and Management Platform</p>
        </div>

        <div className="login-card">
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="auth-toggle">
            <button
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Sign In
            </button>
            <button
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;