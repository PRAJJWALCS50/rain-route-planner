import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otpData, setOtpData] = useState({
    email: '',
    otp: '',
    showOtpForm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email' && !isLogin) {
      setOtpData(prev => ({ ...prev, email: value }));
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOtpChange = (e) => {
    const { name, value } = e.target;
    setOtpData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      if (isLogin) {
        // Demo login - accept any email/password
        if (!formData.email || !formData.password) {
          setError('Please enter email and password');
          return;
        }
        
        const mockUser = {
          id: Date.now().toString(),
          name: formData.email.split('@')[0] || 'User',
          email: formData.email,
          isEmailVerified: true
        };
        
        localStorage.setItem('token', 'demo-token-' + Date.now());
        localStorage.setItem('user', JSON.stringify(mockUser));
        setSuccess('Login successful!');
        setTimeout(() => onLoginSuccess(mockUser), 1000);
      } else {
        // Demo registration
        if (!formData.name || !formData.email || !formData.password) {
          setError('Please fill in all fields');
          return;
        }
        
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        
        // Simulate OTP generation
        const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        setOtpData(prev => ({
          ...prev,
          email: formData.email,
          otp: mockOtp, // Pre-fill with generated OTP for demo
          showOtpForm: true
        }));
        setSuccess(`Registration successful! Your OTP is: ${mockOtp} (demo mode)`);
      }
    } catch (error) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      if (!otpData.otp) {
        setError('Please enter OTP');
        return;
      }
      
      if (otpData.otp.length !== 6) {
        setError('OTP must be 6 digits');
        return;
      }
      
      // Demo OTP verification - accept any 6-digit OTP
      const mockUser = {
        id: Date.now().toString(),
        name: otpData.email.split('@')[0] || 'User',
        email: otpData.email,
        isEmailVerified: true
      };
      
      localStorage.setItem('token', 'demo-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify(mockUser));
      setSuccess('Email verified successfully!');
      setTimeout(() => onLoginSuccess(mockUser), 1000);
    } catch (error) {
      setError('OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Demo Google login
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      const mockUser = {
        id: 'google-demo-' + Date.now(),
        name: 'Google User',
        email: 'user@gmail.com',
        isEmailVerified: true
      };
      
      localStorage.setItem('token', 'google-demo-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify(mockUser));
      setSuccess('Google login successful!');
      setTimeout(() => onLoginSuccess(mockUser), 1000);
      setLoading(false);
    }, 1500);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpData(prev => ({
        ...prev,
        otp: newOtp
      }));
      setSuccess(`New OTP sent! Your OTP is: ${newOtp} (demo mode)`);
    } catch (error) {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (otpData.showOtpForm) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>🌧️ Verify Email</h2>
            <p>Enter the OTP sent to {otpData.email}</p>
          </div>

          <form onSubmit={handleOtpSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={otpData.otp}
                onChange={handleOtpChange}
                placeholder="123456"
                maxLength="6"
                required
                className="otp-input"
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="login-footer">
            <button type="button" onClick={handleResendOtp} className="resend-button" disabled={loading}>
              Resend OTP
            </button>
            <button type="button" onClick={() => setOtpData(prev => ({ ...prev, showOtpForm: false }))} className="back-button">
              Back to {isLogin ? 'Login' : 'Register'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>🌧️ GarajBaras</h2>
          <p>{isLogin ? 'Welcome back!' : 'Create your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              minLength="6"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                minLength="6"
              />
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button onClick={handleGoogleLogin} className="google-button" disabled={loading}>
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="login-footer">
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }} 
            className="toggle-button"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </div>
  );
};

export default Login;
