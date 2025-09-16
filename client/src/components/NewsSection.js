import React, { useState, useEffect } from 'react';
import './NewsSection.css';

const NewsSection = () => {
  // Default news items
  const defaultNewsItems = [
    {
      id: 1,
      title: "Heavy Rainfall Causes Flooding on NH-48",
      location: "Delhi-Gurgaon Highway",
      description: "Severe waterlogging reported on NH-48 near IFFCO Chowk. Traffic moving at snail's pace. Avoid this route if possible.",
      severity: "high",
      timestamp: new Date().toISOString(),
      reporter: "Traffic Control Room"
    },
    {
      id: 2,
      title: "Waterlogging on Ring Road",
      location: "Outer Ring Road, Delhi",
      description: "Moderate waterlogging between Dhaula Kuan and IIT Gate. Expect delays of 15-20 minutes.",
      severity: "medium",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      reporter: "Delhi Traffic Police"
    }
  ];

  // Load news items from localStorage or use default
  const [newsItems, setNewsItems] = useState(() => {
    try {
      const savedNews = localStorage.getItem('garajbaras-news');
      if (savedNews) {
        return JSON.parse(savedNews);
      }
    } catch (error) {
      console.error('Error loading news from localStorage:', error);
    }
    return defaultNewsItems;
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newNews, setNewNews] = useState({
    title: '',
    location: '',
    description: '',
    severity: 'medium'
  });

  // Function to save news items to localStorage
  const saveNewsToStorage = (news) => {
    try {
      localStorage.setItem('garajbaras-news', JSON.stringify(news));
    } catch (error) {
      console.error('Error saving news to localStorage:', error);
    }
  };

  // Update news items and save to localStorage
  const updateNewsItems = (newItems) => {
    setNewsItems(newItems);
    saveNewsToStorage(newItems);
  };

  // Save initial news items to localStorage if not already saved
  useEffect(() => {
    const savedNews = localStorage.getItem('garajbaras-news');
    if (!savedNews) {
      saveNewsToStorage(newsItems);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewNews(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const verifyPassword = () => {
    if (password === 'garajbaras@123') {
      setIsAuthenticated(true);
      setShowPasswordPrompt(false);
      setShowAddForm(true);
      setPassword('');
    } else {
      alert('Incorrect password!');
      setPassword('');
    }
  };

  const handleAddNewsClick = () => {
    if (isAuthenticated) {
      setShowAddForm(!showAddForm);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handleDeleteNews = (id) => {
    if (isAuthenticated) {
      const updatedNews = newsItems.filter(item => item.id !== id);
      updateNewsItems(updatedNews);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handleResetToDefault = () => {
    if (isAuthenticated) {
      if (window.confirm('Are you sure you want to reset all news to default? This will delete all custom news items.')) {
        updateNewsItems(defaultNewsItems);
      }
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newNews.title.trim() || !newNews.location.trim() || !newNews.description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const newsItem = {
      id: Date.now(),
      ...newNews,
      timestamp: new Date().toISOString(),
      reporter: 'User Report'
    };

    const updatedNews = [newsItem, ...newsItems];
    updateNewsItems(updatedNews);
    setNewNews({ title: '', location: '', description: '', severity: 'medium' });
    setShowAddForm(false);
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'high':
        return 'severity-high';
      case 'medium':
        return 'severity-medium';
      case 'low':
        return 'severity-low';
      default:
        return 'severity-medium';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="news-section">
      <div className="news-header">
        <h2>Floody Road News</h2>
        <p>Stay updated with real-time road conditions and flooding reports</p>
        <div className="news-controls">
          <button 
            className="add-news-btn"
            onClick={handleAddNewsClick}
          >
            {showAddForm ? 'Cancel' : '+ Add News Report'}
          </button>
          {isAuthenticated && (
            <button 
              className="reset-news-btn"
              onClick={handleResetToDefault}
            >
              🔄 Reset to Default
            </button>
          )}
        </div>
      </div>

      {showPasswordPrompt && (
        <div className="password-prompt">
          <div className="password-modal">
            <h3>Enter admin password</h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
            />
            <div className="password-buttons">
              <button onClick={verifyPassword}>Submit</button>
              <button onClick={() => {
                setShowPasswordPrompt(false);
                setPassword('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="add-news-form">
          <h3>Report Road Conditions</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={newNews.title}
                onChange={handleInputChange}
                placeholder="e.g., Heavy flooding on main road"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={newNews.location}
                onChange={handleInputChange}
                placeholder="e.g., NH-48, Delhi-Gurgaon Highway"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={newNews.description}
                onChange={handleInputChange}
                placeholder="Describe the road conditions, traffic situation, and any important details..."
                rows="4"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="severity">Severity Level</label>
              <select
                id="severity"
                name="severity"
                value={newNews.severity}
                onChange={handleInputChange}
              >
                <option value="low">Low - Minor delays</option>
                <option value="medium">Medium - Moderate delays</option>
                <option value="high">High - Major delays/avoid route</option>
              </select>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn">Submit Report</button>
              <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="news-list">
        {newsItems.length === 0 ? (
          <div className="no-news">
            <p>No news reports available. Be the first to report road conditions!</p>
          </div>
        ) : (
          newsItems.map(item => (
            <div key={item.id} className={`news-item ${getSeverityClass(item.severity)}`}>
              <div className="news-item-header">
                <div className="severity-indicator">
                  <span className="severity-icon">{getSeverityIcon(item.severity)}</span>
                  <span className="severity-text">{item.severity.toUpperCase()}</span>
                </div>
                <div className="news-timestamp">{formatTimestamp(item.timestamp)}</div>
              </div>
              
              <div className="news-content">
                <h3 className="news-title">{item.title}</h3>
                <div className="news-location">📍 {item.location}</div>
                <p className="news-description">{item.description}</p>
                <div className="news-reporter">Reported by: {item.reporter}</div>
                {isAuthenticated && (
                  <button 
                    className="delete-news-btn"
                    onClick={() => handleDeleteNews(item.id)}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NewsSection;
