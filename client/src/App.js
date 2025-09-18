import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import MapView from './MapView';
import WelcomePopup from './components/WelcomePopup';
import NewsSection from './components/NewsSection';

function App() {
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    departureTime: new Date().toISOString().slice(0, 16),
    speed: 60,
    spacing: 3
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(true);

  // Handle welcome popup close
  const handleWelcomePopupClose = () => {
    setShowWelcomePopup(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.source.trim() || !formData.destination.trim()) {
      setError('Please enter both source and destination cities.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Use proxy in development, direct URL in production
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/check-route' 
        : '/api/check-route'; // Use proxy in development
      
      console.log('Making API call to:', apiUrl);
      const response = await axios.post(apiUrl, formData, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setResults(response.data);
    } catch (error) {
      console.error('API Error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.code === 'ECONNREFUSED') {
        setError('Cannot connect to server. Please make sure the backend server is running on port 5000.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        setError('Request timed out. The server might be busy. Please try again.');
      } else {
        setError(`Failed to fetch route information: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters) => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'high':
        return 'rain';
      case 'medium':
        return 'cloudy';
      case 'low':
        return 'clear';
      default:
        return 'unknown';
    }
  };

  return (
    <div className="App">
      {showWelcomePopup && (
        <WelcomePopup onClose={handleWelcomePopupClose} />
      )}
      <div className="container">
        <header className="app-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h1 className="app-title">🌧️ GarajBaras</h1>
              <p className="app-subtitle">Plan your journey across India with real-time weather alerts</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source">Source City</label>
              <input
                type="text"
                id="source"
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                placeholder="e.g., Mumbai, Delhi, Bangalore"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="destination">Destination City</label>
              <input
                type="text"
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                placeholder="e.g., Chennai, Kolkata, Hyderabad"
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="departureTime">Departure Time</label>
              <input
                type="datetime-local"
                id="departureTime"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="speed">Speed (km/h)</label>
              <input
                type="number"
                id="speed"
                name="speed"
                value={formData.speed}
                onChange={handleInputChange}
                min="10"
                max="200"
                placeholder="60"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="spacing">Waypoint Spacing (km)</label>
              <input
                type="number"
                id="spacing"
                name="spacing"
                value={formData.spacing}
                onChange={handleInputChange}
                min="1"
                max="50"
                placeholder="3"
              />
            </div>
            <div className="form-group">
              <button 
                type="submit" 
                className="check-button"
                disabled={loading}
              >
                {loading ? 'Checking Route...' : 'Check Weather & Route'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Fetching route information and weather data...</p>
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <h2 className="results-title">Route & Weather Alerts</h2>
            </div>

            {/* Map section */}
            <div style={{ marginBottom: 24 }}>
              <MapView routePath={results.route.routePath || []} alerts={results.weatherAlerts || []} />
            </div>

            <div className="route-summary">
              <h3>Route Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <div className="summary-label">Total Distance</div>
                  <div className="summary-value">{formatDistance(results.route.totalDistance)}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Duration</div>
                  <div className="summary-value">{formatDuration(results.route.totalDuration)}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Waypoints</div>
                  <div className="summary-value">{results.route.waypoints.length}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Departure</div>
                  <div className="summary-value">
                    {new Date(formData.departureTime).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Speed</div>
                  <div className="summary-value">{formData.speed} km/h</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Spacing</div>
                  <div className="summary-value">{formData.spacing} km</div>
                </div>
              </div>
            </div>

            <div className="alerts-list">
              {results.weatherAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`alert-item ${getSeverityClass(alert.severity)}`}
                >
                  <div className="alert-header">
                    <div className="alert-location">{alert.location}</div>
                    <div className="alert-time">{alert.arrivalTime}</div>
                  </div>
                  
                  <div className="alert-message">{alert.alert}</div>
                  
                  {alert.weatherData && (
                    <div className="weather-details">
                      <div className="weather-item">
                        <div className="weather-label">Temperature</div>
                        <div className="weather-value">{alert.weatherData.temperature}°C</div>
                      </div>
                      <div className="weather-item">
                        <div className="weather-label">Distance Traveled</div>
                        <div className="weather-value">{((alert.weatherData.distanceFromStart || 0) / 1000).toFixed(2)} km</div>
                      </div>
                      <div className="weather-item">
                        <div className="weather-label">Humidity</div>
                        <div className="weather-value">{parseFloat(alert.weatherData.humidity).toFixed(2)}%</div>
                      </div>
                      <div className="weather-item">
                        <div className="weather-label">Wind Speed</div>
                        <div className="weather-value">{parseFloat(alert.weatherData.windSpeed).toFixed(2)} m/s</div>
                      </div>
                      {alert.weatherData.isForecast && (
                        <div className="weather-item">
                          <div className="weather-label">Data Type</div>
                          <div className="weather-value" style={{ color: '#059669', fontWeight: 'bold' }}>
                            📅 Forecast Data
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News Section - Always visible */}
        <NewsSection />
      </div>
    </div>
  );
}

export default App;