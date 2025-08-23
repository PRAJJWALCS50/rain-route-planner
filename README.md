# 🌧️ Rain Route Planner - India

A weather-aware route planning application that helps users plan their journeys across India by providing real-time weather alerts, especially rainfall conditions, along their route.

## ✨ Features

- **Route Planning**: Get detailed routes between any two cities in India using Google Maps API
- **Weather Integration**: Real-time weather data for each waypoint along the route
- **Rain Alerts**: Get notified about rainfall conditions at each location when you're expected to arrive
- **Real-time Updates**: Dynamic route and weather information based on departure time
- **Responsive Design**: Modern, mobile-friendly UI with beautiful gradients and animations
- **Color-coded Alerts**: Green for clear weather, red for rain alerts

## 🚀 Tech Stack

### Backend
- **Node.js** with **Express.js** framework
- **OpenRouteService API** for route planning (free alternative to Google Maps)
- **OpenWeatherMap API** for weather data (fallback to mock data for demo)
- **CORS** enabled for cross-origin requests

### Frontend
- **React.js** with modern hooks
- **Axios** for API communication
- **CSS3** with modern features (Grid, Flexbox, Animations)
- **Responsive design** for all devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- OpenRouteService API key
- OpenWeatherMap API key (optional, for real weather data)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd rain-route-planner
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### 4. Environment Configuration
Create a `.env` file in the root directory:
```bash
# OpenRouteService API Key (Required)
OPENROUTE_API_KEY=your_openroute_api_key_here

# OpenWeatherMap API Key (Optional)
WEATHER_API_KEY=your_openweathermap_api_key_here

# Server Port (Optional)
PORT=5000
```

### 5. Get API Keys

#### OpenRouteService API Key
1. Go to [OpenRouteService](https://openrouteservice.org/dev/#/signup)
2. Sign up for a free account
3. Get your API key from the dashboard
4. The free tier includes 2,000 requests per day

#### OpenWeatherMap API Key (Optional)
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key
3. Add it to the `.env` file

## 🚀 Running the Application

### Development Mode

#### Start Backend Server
```bash
npm run dev
```
The backend will run on `http://localhost:5000`

#### Start Frontend (in a new terminal)
```bash
npm run client
```
The frontend will run on `http://localhost:3000`

### Production Mode
```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

## 📱 Usage

1. **Enter Source City**: Type the starting city (e.g., Mumbai, Delhi, Bangalore)
2. **Enter Destination City**: Type the destination city (e.g., Chennai, Kolkata, Hyderabad)
3. **Set Departure Time**: Choose when you plan to start your journey
4. **Click "Check Weather & Route"**: The app will fetch route information and weather data
5. **View Results**: See the route summary and weather alerts for each waypoint

## 🔍 API Endpoints

### Backend API
- `POST /api/check-route` - Get route and weather information
- `GET /api/health` - Health check endpoint

### Request Format
```json
{
  "source": "Mumbai",
  "destination": "Delhi",
  "departureTime": "2024-01-15T10:00"
}
```

### Response Format
```json
{
  "route": {
    "waypoints": [...],
    "totalDuration": 3600,
    "totalDistance": 100000
  },
  "weatherAlerts": [
    {
      "location": "Kurukshetra",
      "arrivalTime": "3:15 PM",
      "alert": "Rain Alert: Expect rains in Kurukshetra at 3:15 PM.",
      "severity": "high",
      "weatherData": {...}
    }
  ]
}
```

## 🎨 UI Components

- **Form Container**: Clean input fields for source, destination, and departure time
- **Route Summary**: Overview of total distance, duration, and waypoints
- **Weather Alerts**: Color-coded alerts for each location
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🔧 Configuration Options

### Customizing Weather API
The application uses OpenWeatherMap API by default. You can modify the `getWeatherData` function in `server.js` to integrate with other weather services like:
- IMD (India Meteorological Department) APIs
- AccuWeather API
- WeatherAPI.com

### Route Optimization
Modify the `getRouteFromOpenRoute` function to:
- Enable alternative routes
- Add traffic considerations
- Include toll roads or highways preferences
- Change routing profile (driving-car, driving-hgv, cycling-regular, etc.)

## 🚨 Error Handling

The application includes comprehensive error handling for:
- Invalid city names
- API failures
- Network issues
- Missing API keys

## 📱 Mobile Responsiveness

The UI is fully responsive with:
- Mobile-first design approach
- Touch-friendly interface
- Optimized layouts for small screens
- Progressive enhancement

## 🔒 Security Features

- CORS configuration for controlled access
- Environment variable protection for API keys
- Input validation and sanitization
- Rate limiting considerations

## 🧪 Testing

```bash
# Run frontend tests
cd client
npm test

# Run backend tests (when implemented)
npm test
```

## 📈 Performance Optimizations

- Efficient API calls with proper error handling
- Lazy loading of weather data
- Optimized route waypoint selection
- Responsive image loading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include your environment details and error logs

## 🔮 Future Enhancements

- [ ] Real-time traffic integration
- [ ] Multiple route alternatives
- [ ] Weather forecasting for future dates
- [ ] Push notifications for severe weather
- [ ] Offline mode support
- [ ] Multi-language support
- [ ] Integration with ride-sharing apps

## 📊 Demo Data

When API keys are not configured, the application uses mock data for demonstration purposes, allowing you to see the full functionality without external dependencies.

---

**Built with ❤️ for safe travels across India**
