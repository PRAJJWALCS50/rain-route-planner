import React from 'react';
import './WelcomePopup.css';

const WelcomePopup = ({ onClose }) => {
  return (
    <div className="welcome-popup-overlay">
      <div className="welcome-popup">
        <div className="welcome-popup-header">
          <h2>🌧️ Welcome to GarajBaras</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="welcome-popup-content">
          <p className="welcome-description">
            Plan your journey across India with real-time weather alerts and route optimization.
            Get notified about rainfall conditions and weather changes along your route.
          </p>
        </div>
        <div className="welcome-popup-footer">
          <button className="get-started-button" onClick={onClose}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;
