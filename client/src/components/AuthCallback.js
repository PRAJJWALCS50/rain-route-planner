import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
      // Store token and redirect to main app
      localStorage.setItem('token', token);
      // The main App component will handle fetching user data
      navigate('/');
    } else if (error) {
      // Handle error
      console.error('Google auth error:', error);
      navigate('/login?error=google_auth_failed');
    } else {
      // No token or error, redirect to login
      navigate('/login');
    }
  }, [location, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <h3 style={{ color: '#333', marginBottom: '10px' }}>Authenticating...</h3>
        <p style={{ color: '#666' }}>Please wait while we complete your login.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
