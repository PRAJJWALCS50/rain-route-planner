const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB disabled for demo mode
console.log('MongoDB disabled - running in demo mode');

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://garajbaras.vercel.app',
    'https://garajbaras-git-main-prajjwalcs50.vercel.app',
    'https://garajbaras-prajjwalcs50.vercel.app'
  ],
  credentials: true
}));

// Enhanced JSON parsing with error handling
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('❌ JSON parsing error:', e.message);
      console.error('❌ Raw body:', buf.toString());
      throw new Error('Invalid JSON');
    }
  }
}));

// Session configuration disabled for demo mode
console.log('Session management disabled - running in demo mode');

// OpenRouteService API configuration
const OPENROUTE_API_KEY = process.env.OPENROUTE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'HTNJcLddtA3C4CKdA6fKofZXODA4qBji';
const WEATHER_API_PROVIDER = process.env.WEATHER_API_PROVIDER || 'windy'; // openweathermap, windy, or demo

// Utility: better axios error logging
function logAxiosError(error, label) {
	if (error && error.response) {
		console.error(`${label} status:`, error.response.status, error.response.statusText);
		try {
			console.error(`${label} data:`, JSON.stringify(error.response.data));
		} catch (_) {
			console.error(`${label} raw data:`, error.response.data);
		}
	} else if (error && error.request) {
		console.error(`${label} no response received`);
	} else if (error) {
		console.error(`${label} error:`, error.message);
	}
}

if (!OPENROUTE_API_KEY || OPENROUTE_API_KEY === 'demo') {
  console.warn('⚠️ OPENROUTE_API_KEY is not set or is set to "demo". Routing requests will use mock data.');
  console.warn('   To get real routing data, sign up at https://openrouteservice.org/dev/#/signup');
}

// Utility: haversine distance in meters
function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Utility: generate equidistant waypoints along geometry at fixed interval (meters)
function generateWaypointsByDistance(geometryCoords, intervalMeters, totalDistance, totalDuration) {
  const waypoints = [];
  if (!Array.isArray(geometryCoords) || geometryCoords.length < 2) return waypoints;

  let accumulated = 0;
  let nextThreshold = intervalMeters;
  let distanceFromStart = 0;

  for (let i = 1; i < geometryCoords.length; i++) {
    const [lon1, lat1] = geometryCoords[i - 1];
    const [lon2, lat2] = geometryCoords[i];
    const seg = distanceMeters(lat1, lon1, lat2, lon2);

    while (accumulated + seg >= nextThreshold) {
      const remaining = nextThreshold - accumulated;
      const ratio = Math.max(0, Math.min(1, seg > 0 ? remaining / seg : 0));
      const interpLon = lon1 + (lon2 - lon1) * ratio;
      const interpLat = lat1 + (lat2 - lat1) * ratio;

      const distAtPoint = distanceFromStart + remaining; // meters from start
      const durationAtPoint = totalDistance > 0 ? (totalDuration * (distAtPoint / totalDistance)) : 0; // seconds

      waypoints.push({
        name: `~${Math.round(nextThreshold / 1000)} km`,
        location: { lat: interpLat, lng: interpLon },
        arrivalTime: null,
        duration: Math.round(durationAtPoint),
        distanceFromStart: distAtPoint // distance from start in meters
      });

      nextThreshold += intervalMeters;
    }

    accumulated += seg;
    distanceFromStart += seg;
  }

  return waypoints;
}

// Cache for reverse geocoding to reduce API calls
const reverseCache = new Map();

// Reverse geocode a coordinate to a readable place name
async function reverseGeocodeName(lat, lng) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);

  // Try OpenRouteService reverse geocode first
  try {
    const orsResp = await axios.get('https://api.openrouteservice.org/geocode/reverse', {
      params: { 'point.lat': lat, 'point.lon': lng, size: 1 },
      headers: { Authorization: OPENROUTE_API_KEY }
    });
    if (orsResp.data && Array.isArray(orsResp.data.features) && orsResp.data.features.length > 0) {
      const props = orsResp.data.features[0].properties || {};
      const candidate = props.name || props.locality || props.region || props.county || props.state || props.country;
      if (candidate) {
        reverseCache.set(key, candidate);
        return candidate;
      }
    }
  } catch (e) {
    // fall through to nominatim
  }

  // Fallback to Nominatim (respect usage policy)
  try {
    const nom = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'json', zoom: 10, addressdetails: 1 },
          headers: { 'User-Agent': 'GarajBaras/1.0 (contact: example@example.com)' }
    });
    const a = (nom.data && nom.data.address) || {};
    const candidate = a.city || a.town || a.village || a.suburb || a.county || a.state || a.country;
    if (candidate) {
      reverseCache.set(key, candidate);
      return candidate;
    }
  } catch (e) {
    // ignore
  }

  const fallback = 'Waypoint';
  reverseCache.set(key, fallback);
  return fallback;
}

// Assign human-readable names to generated waypoints with concurrency control
async function nameGeneratedWaypoints(waypoints) {
  const candidates = waypoints.filter(w => typeof w.name === 'string' && w.name.startsWith('~'));
  if (candidates.length === 0) return;

  const maxToName = 120; // protect from rate-limits
  const step = Math.max(1, Math.ceil(candidates.length / maxToName));
  const queue = candidates.map((w, idx) => ({ w, idx })).filter((_, i) => i % step === 0);

  const concurrency = 5;
  for (let i = 0; i < queue.length; i += concurrency) {
    const batch = queue.slice(i, i + concurrency);
    await Promise.all(batch.map(async ({ w }) => {
      const name = await reverseGeocodeName(w.location.lat, w.location.lng);
      if (name) w.name = name;
    }));
  }
}

// Import routes (conditional) - DISABLED FOR DEMO
let authRoutes, optionalAuth;
console.log('Authentication disabled - running in demo mode');

// Mock auth routes for demo mode
app.post('/api/auth/login', (req, res) => {
  res.status(503).json({ error: 'Authentication system disabled in demo mode.' });
});

app.post('/api/auth/register', (req, res) => {
  res.status(503).json({ error: 'Authentication system disabled in demo mode.' });
});

app.post('/api/auth/verify-otp', (req, res) => {
  res.status(503).json({ error: 'Authentication system disabled in demo mode.' });
});

app.get('/api/auth/google', (req, res) => {
  res.status(503).json({ error: 'Google OAuth disabled in demo mode.' });
});

console.log('Mock authentication routes loaded (demo mode)');

// Route to get route information and weather alerts
app.post('/api/check-route', optionalAuth || ((req, res, next) => next()), async (req, res) => {
  try {
    console.log('📥 Received request body:', JSON.stringify(req.body, null, 2));
    console.log('📥 Request headers:', req.headers);
    
    const { source, destination, departureTime, speed = 60, spacing = 3 } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    // Get route from OpenRouteService API
    console.log('Getting route for:', { source, destination, speed, spacing });
    const routeData = await getRouteFromOpenRoute(source, destination, speed, spacing);
    
    if (!routeData) {
      console.error('Route generation returned empty response', { source, destination });
      return res.status(502).json({ 
        error: 'Failed to get route information. Please check if the city names are correct and try again.' 
      });
    }

    // Get weather data for each waypoint with ETA-based forecasts
    const weatherAlerts = await getWeatherAlerts(routeData.waypoints, departureTime, speed);
    
    res.json({
      route: routeData,
      weatherAlerts: weatherAlerts
    });

  } catch (error) {
    console.error('Error checking route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to get route from OpenRouteService API
async function getRouteFromOpenRoute(source, destination, speed = 60, spacing = 3) {
  try {
    // Check if we have a valid API key
    if (!OPENROUTE_API_KEY || OPENROUTE_API_KEY === 'demo') {
      console.log('🔄 Using mock routing data (no OpenRoute API key)');
      return getMockRouteData(source, destination, speed, spacing);
    }

    // First, geocode the source and destination cities to get coordinates
    console.log('Geocoding source city:', source);
    const sourceCoords = await geocodeCity(source);
    console.log('Geocoding destination city:', destination);
    const destCoords = await geocodeCity(destination);
    
    if (!sourceCoords || !destCoords) {
      console.error('Geocoding failed:', { source, sourceCoords, destination, destCoords });
      throw new Error(`Could not geocode cities: ${source} or ${destination}`);
    }

    console.log('Geocoded:', { source, sourceCoords, destination, destCoords });

    const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
    const headers = {
      'Authorization': OPENROUTE_API_KEY,
      'Content-Type': 'application/json'
    };

    const body = {
      coordinates: [
        [sourceCoords.lng, sourceCoords.lat],
        [destCoords.lng, destCoords.lat]
      ],
      instructions: true,
      preference: 'fastest',
      units: 'm'
    };

    const response = await axios.post(url, body, { headers });
    const data = response.data;

    // Support both GeoJSON (features) and JSON (routes) shapes
    let route;
    let properties;
    let geometryCoords = [];

    if (data && Array.isArray(data.features) && data.features.length > 0) {
      // GeoJSON format
      route = data.features[0];
      properties = route.properties;
      geometryCoords = (route.geometry && route.geometry.coordinates) || [];
    } else if (data && Array.isArray(data.routes) && data.routes.length > 0) {
      // JSON format
      route = data.routes[0];
      properties = route;
      // If geometry format is geojson, geometry.coordinates will exist
      geometryCoords = (route.geometry && route.geometry.coordinates) || [];
    } else {
      console.error('ORS directions: unexpected response shape', JSON.stringify(data).slice(0, 1000));
      return null;
    }

    if (properties) {
      const waypoints = [];
      
      // Always include source at time 0
      waypoints.push({
        name: source,
        location: { lat: sourceCoords.lat, lng: sourceCoords.lng },
        arrivalTime: null,
        duration: 0,
        distanceFromStart: 0
      });

      // Generate waypoints using distance/spacing formula: number_of_waypoints = distance / spacing
      const totalDistance = (properties.summary && properties.summary.distance) || properties.distance || 0;
      const totalDuration = (properties.summary && properties.summary.duration) || properties.duration || 0;
      
      if (Array.isArray(geometryCoords) && geometryCoords.length > 1 && totalDistance > 0) {
        // Calculate number of waypoints based on formula: distance / spacing
        const spacingKm = spacing; // spacing in kilometers
        const totalDistanceKm = totalDistance / 1000; // convert meters to km
        const numberOfWaypoints = Math.max(1, Math.floor(totalDistanceKm / spacingKm));
        
        // Calculate interval in meters based on number of waypoints
        const intervalMeters = totalDistance / numberOfWaypoints;
        
        const evenWaypoints = generateWaypointsByDistance(
          geometryCoords,
          intervalMeters,
          totalDistance,
          totalDuration
        );
        
        console.log('Waypoint generation stats:', {
          totalDistanceKm: totalDistanceKm.toFixed(2),
          spacingKm,
          numberOfWaypoints,
          intervalMeters: Math.round(intervalMeters),
          geometryPoints: geometryCoords.length,
          generated: evenWaypoints.length
        });
        waypoints.push(...evenWaypoints);
      }

      // Add destination
      waypoints.push({
        name: destination,
        location: { lat: destCoords.lat, lng: destCoords.lng },
        arrivalTime: null,
        duration: properties.summary && typeof properties.summary.duration === 'number' ? properties.summary.duration : (properties.duration || 0),
        distanceFromStart: totalDistance
      });

      // Prepare route path (lat/lng pairs) for map display
      const routePath = Array.isArray(geometryCoords)
        ? geometryCoords.map(([lon, lat]) => ({ lat, lng: lon }))
        : [];

      // Name the generated (~X km) waypoints via reverse geocoding (best-effort)
      await nameGeneratedWaypoints(waypoints);

      const result = {
        waypoints: waypoints,
        totalDuration: properties.summary && typeof properties.summary.duration === 'number' ? properties.summary.duration : (properties.duration || 0),
        totalDistance: properties.summary && typeof properties.summary.distance === 'number' ? properties.summary.distance : (properties.distance || 0),
        routePath
      };
      console.log('Waypoints returned:', result.waypoints.length);
      return result;
    }
    
    return null;
  } catch (error) {
    logAxiosError(error, 'OpenRouteService directions error');
    return null;
  }
}

// Function to geocode city names to coordinates using OpenRouteService Geocoding
async function geocodeCity(cityName) {
  try {
    // Try multiple search variations for better results
    const searchVariations = [
      `${cityName}, India`,
      `${cityName}, Uttar Pradesh, India`,
      `${cityName}, UP, India`,
      cityName
    ];

    // Try OpenRouteService first with different search terms
    for (const searchTerm of searchVariations) {
      try {
        const url = `https://api.openrouteservice.org/geocode/search`;
        const params = {
          text: searchTerm,
          size: 1,
          layers: 'locality,borough,county,region,macroregion',
          'boundary.country': 'IN'
        };

        const headers = {
          'Authorization': OPENROUTE_API_KEY
        };

        const response = await axios.get(url, { params, headers });
        
        if (response.data && response.data.features && response.data.features.length > 0) {
          const feature = response.data.features[0];
          console.log(`✅ Geocoded "${cityName}" using ORS with term: "${searchTerm}"`);
          return {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          };
        }
      } catch (orsError) {
        // Continue to next variation
        continue;
      }
    }
    
    // Fallback to Nominatim with multiple search variations
    for (const searchTerm of searchVariations) {
      try {
        const nom = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: searchTerm,
            format: 'json',
            limit: 1,
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'GarajBaras/1.0 (contact: example@example.com)'
          }
        });
        
        if (Array.isArray(nom.data) && nom.data.length > 0) {
          console.log(`✅ Geocoded "${cityName}" using Nominatim with term: "${searchTerm}"`);
          return {
            lat: parseFloat(nom.data[0].lat),
            lng: parseFloat(nom.data[0].lon)
          };
        }
      } catch (nomError) {
        // Continue to next variation
        continue;
      }
    }
    
    console.log(`❌ Failed to geocode "${cityName}" with all search variations`);
    return null;
  } catch (error) {
    logAxiosError(error, 'Geocoding error');
    
    // Enhanced mock coordinates for demo purposes
    const mockCities = {
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'delhi': { lat: 28.7041, lng: 77.1025 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'kolkata': { lat: 22.5726, lng: 88.3639 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'jaipur': { lat: 26.9124, lng: 75.7873 },
      'lucknow': { lat: 26.8467, lng: 80.9462 },
      'bulandshehr': { lat: 28.3874, lng: 77.9744 },
      'bulandshahr': { lat: 28.3874, lng: 77.9744 },
      'sambhal': { lat: 28.4272, lng: 78.5565 },
      'meerut': { lat: 28.9845, lng: 77.7064 },
      'ghaziabad': { lat: 28.6692, lng: 77.4538 },
      'noida': { lat: 28.5355, lng: 77.3910 },
      'gurgaon': { lat: 28.4595, lng: 77.0266 },
      'faridabad': { lat: 28.4089, lng: 77.3178 },
      'agra': { lat: 27.1767, lng: 78.0081 },
      'kanpur': { lat: 26.4499, lng: 80.3319 },
      'varanasi': { lat: 25.3176, lng: 82.9739 }
    };
    
    const cityKey = cityName.toLowerCase().trim();
    const mockCoords = mockCities[cityKey];
    
    if (mockCoords) {
      console.log(`📍 Using mock coordinates for "${cityName}":`, mockCoords);
      return mockCoords;
    }
    
    // Default to India center if no mock data available
    console.log(`📍 Using default India center for "${cityName}"`);
    return { lat: 20.5937, lng: 78.9629 };
  }
}

// Function to get weather alerts for waypoints
async function getWeatherAlerts(waypoints, departureTime, speed = 60) {
  const alerts = [];
  const departureDate = new Date(departureTime || Date.now());
  
  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];
    
    // Calculate ETA based on speed and distance from start
    // ALWAYS use speed-based calculation for accurate ETA
    let arrivalTime;
    const distanceFromStart = waypoint.distanceFromStart || 0; // in meters
    
    if (distanceFromStart >= 0) {
      // Calculate ETA based on speed: ETA = departure_time + (distance / speed)
      const distanceKm = distanceFromStart / 1000; // convert to km
      const timeHours = distanceKm / speed; // time in hours
      const timeMs = timeHours * 60 * 60 * 1000; // convert to milliseconds
      arrivalTime = new Date(departureDate.getTime() + timeMs);
      
      if (distanceFromStart === 0) {
        console.log(`📍 Source waypoint: ${waypoint.name}, Distance: ${distanceKm.toFixed(2)}km, Speed: ${speed}km/h, ETA: ${arrivalTime.toISOString()}`);
      } else {
        console.log(`📍 Waypoint: ${waypoint.name}, Distance: ${distanceKm.toFixed(2)}km, Speed: ${speed}km/h, ETA: ${arrivalTime.toISOString()}`);
      }
    } else {
      // Fallback for waypoints without distance data
      arrivalTime = departureDate;
      console.log(`📍 Waypoint without distance: ${waypoint.name}, ETA: ${arrivalTime.toISOString()}`);
    }
    
    // Update waypoint with arrival time
    waypoint.arrivalTime = arrivalTime;
    
    try {
      // Get weather data for the location at the ETA time
      console.log(`🌤️ Getting weather for ${waypoint.name} at ETA: ${arrivalTime.toISOString()}`);
      const weather = await getWeatherData(waypoint.location.lat, waypoint.location.lng, arrivalTime);
      
      // Generate appropriate alert based on forecast weather
      const forecastTime = weather.forecastTime ? new Date(weather.forecastTime) : arrivalTime;
      const timeDiff = Math.abs(forecastTime.getTime() - arrivalTime.getTime()) / (1000 * 60 * 60); // hours
      
      if (weather && weather.rain) {
        alerts.push({
          location: waypoint.name,
          arrivalTime: arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          alert: `🌧️ Rain Alert: Expect rains in ${waypoint.name} at ${arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}. Forecast accuracy: ±${Math.round(timeDiff)}h`,
          severity: 'high',
          weatherData: { ...weather, distanceFromStart: waypoint.distanceFromStart },
          coords: { lat: waypoint.location.lat, lng: waypoint.location.lng }
        });
      } else if (weather && weather.description && weather.description.includes('cloud')) {
        alerts.push({
          location: waypoint.name,
          arrivalTime: arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          alert: `☁️ Cloudy weather expected in ${waypoint.name} at ${arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}. Forecast accuracy: ±${Math.round(timeDiff)}h`,
          severity: 'medium',
          weatherData: { ...weather, distanceFromStart: waypoint.distanceFromStart },
          coords: { lat: waypoint.location.lat, lng: waypoint.location.lng }
        });
      } else {
        alerts.push({
          location: waypoint.name,
          arrivalTime: arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          alert: `☀️ Clear weather expected in ${waypoint.name} at ${arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}. Forecast accuracy: ±${Math.round(timeDiff)}h`,
          severity: 'low',
          weatherData: { ...weather, distanceFromStart: waypoint.distanceFromStart },
          coords: { lat: waypoint.location.lat, lng: waypoint.location.lng }
        });
      }
    } catch (error) {
      console.error(`Error getting weather for ${waypoint.name}:`, error);
      alerts.push({
        location: waypoint.name,
        arrivalTime: arrivalTime.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        alert: `Weather data unavailable for ${waypoint.name}`,
        severity: 'unknown',
        weatherData: { distanceFromStart: waypoint.distanceFromStart },
        coords: { lat: waypoint.location.lat, lng: waypoint.location.lng }
      });
    }
  }
  
  return alerts;
}

// Mock route data function for when OpenRoute API key is not available
function getMockRouteData(source, destination, speed = 60, spacing = 3) {
  console.log('🔄 Generating mock route data...');
  
  // Mock coordinates for major Indian cities
  const mockCities = {
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'lucknow': { lat: 26.8467, lng: 80.9462 }
  };
  
  const sourceKey = source.toLowerCase().trim();
  const destKey = destination.toLowerCase().trim();
  
  const sourceCoords = mockCities[sourceKey] || { lat: 28.7041, lng: 77.1025 }; // Default to Delhi
  const destCoords = mockCities[destKey] || { lat: 19.0760, lng: 72.8777 }; // Default to Mumbai
  
  // Calculate distance and duration
  const distance = distanceMeters(sourceCoords.lat, sourceCoords.lng, destCoords.lat, destCoords.lng);
  const duration = (distance / 1000) / speed * 3600; // Convert to seconds
  
  // Generate waypoints
  const waypoints = [];
  waypoints.push({
    name: source,
    location: { lat: sourceCoords.lat, lng: sourceCoords.lng },
    arrivalTime: null,
    duration: 0,
    distanceFromStart: 0
  });
  
  // Generate intermediate waypoints
  const spacingKm = spacing;
  const totalDistanceKm = distance / 1000;
  const numberOfWaypoints = Math.max(1, Math.floor(totalDistanceKm / spacingKm));
  
  for (let i = 1; i <= numberOfWaypoints; i++) {
    const ratio = i / (numberOfWaypoints + 1);
    const lat = sourceCoords.lat + (destCoords.lat - sourceCoords.lat) * ratio;
    const lng = sourceCoords.lng + (destCoords.lng - sourceCoords.lng) * ratio;
    const distanceFromStart = distance * ratio;
    const durationFromStart = duration * ratio;
    
    waypoints.push({
      name: `Waypoint ${i}`,
      location: { lat, lng },
      arrivalTime: null,
      duration: Math.round(durationFromStart),
      distanceFromStart: distanceFromStart
    });
  }
  
  waypoints.push({
    name: destination,
    location: { lat: destCoords.lat, lng: destCoords.lng },
    arrivalTime: null,
    duration: Math.round(duration),
    distanceFromStart: distance
  });
  
  // Generate route path for map display
  const routePath = waypoints.map(wp => ({ lat: wp.location.lat, lng: wp.location.lng }));
  
  return {
    waypoints: waypoints,
    totalDuration: Math.round(duration),
    totalDistance: distance,
    routePath: routePath
  };
}

// Function to get weather data from Windy.com Point Forecast API
async function getWeatherData(lat, lng, etaTime = null) {
  try {
    // Windy.com Point Forecast API endpoint
    const windyUrl = 'https://api.windy.com/api/point-forecast/v2';
    
    // Calculate forecast time - Windy API works with Unix timestamps
    let forecastTimestamp;
    if (etaTime) {
      forecastTimestamp = Math.floor(etaTime.getTime() / 1000);
    } else {
      // If no ETA, use current time + 3 hours
      forecastTimestamp = Math.floor((Date.now() + 3 * 60 * 60 * 1000) / 1000);
    }

    const requestPayload = {
      lat: lat,
      lon: lng,
      model: "gfs", // Global Forecast System model
      parameters: ["temp", "wind", "precip", "rh"], // temperature, wind, precipitation, relative humidity
      levels: ["surface"],
      key: WEATHER_API_KEY
    };

    console.log(`🌤️ Fetching Windy forecast for ETA: ${etaTime ? etaTime.toISOString() : 'No ETA provided'}`);
    console.log(`📍 Location: ${lat}, ${lng}, Timestamp: ${forecastTimestamp}`);
    
    const response = await axios.post(windyUrl, requestPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.ts && response.data.ts.length > 0) {
      const timestamps = response.data.ts;
      const data = response.data;
      
      // Find the closest timestamp to our forecast time
      let closestIndex = 0;
      let minTimeDiff = Math.abs(timestamps[0] - forecastTimestamp);
      
      for (let i = 1; i < timestamps.length; i++) {
        const timeDiff = Math.abs(timestamps[i] - forecastTimestamp);
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestIndex = i;
        }
      }
      
      const forecastTime = new Date(timestamps[closestIndex] * 1000);
      console.log(`📅 Using Windy forecast for ${forecastTime.toISOString()} (ETA: ${etaTime?.toISOString()}, diff: ${Math.round(minTimeDiff/3600)}h)`);
      
      // Extract weather data from Windy response
      const temperature = data['temp-surface'] && data['temp-surface'][closestIndex] ? data['temp-surface'][closestIndex] : null;
      const windU = data['wind_u-surface'] && data['wind_u-surface'][closestIndex] ? data['wind_u-surface'][closestIndex] : 0;
      const windV = data['wind_v-surface'] && data['wind_v-surface'][closestIndex] ? data['wind_v-surface'][closestIndex] : 0;
      const precipitation = data['past3hprecip-surface'] && data['past3hprecip-surface'][closestIndex] ? data['past3hprecip-surface'][closestIndex] : 0;
      const humidity = data['rh-surface'] && data['rh-surface'][closestIndex] ? data['rh-surface'][closestIndex] : null;
      
      // Calculate wind speed from U and V components (Pythagorean theorem)
      const windSpeedMs = Math.sqrt(windU * windU + windV * windV);
      
      // Convert temperature from Kelvin to Celsius
      const temperatureCelsius = temperature ? temperature - 273.15 : 25;
      
      // Determine weather description based on precipitation and other factors
      let description = 'clear sky';
      if (precipitation > 0.1) {
        description = precipitation > 2 ? 'heavy rain' : 'light rain';
      } else if (humidity && humidity > 80) {
        description = 'overcast clouds';
      } else if (humidity && humidity > 60) {
        description = 'scattered clouds';
      } else {
        description = 'clear sky';
      }
      
      return {
        temperature: Math.round(temperatureCelsius),
        description: description,
        rain: precipitation > 0.0001, // Convert from meters to mm threshold
        humidity: humidity ? Math.round(humidity) : 70,
        windSpeed: Math.round(windSpeedMs * 10) / 10, // Round to 1 decimal place
        forecastTime: forecastTime.toISOString(),
        isForecast: true
      };
    }
    
    throw new Error('No forecast data available from Windy API');
    
  } catch (error) {
    console.error('Windy.com forecast API error:', error);
    if (error.response) {
      console.error('Windy API response:', error.response.status, error.response.data);
    }
    console.log('🔧 Using mock data fallback...');
    
    // Return mock forecast data for demo purposes with ETA-based variation
    const baseTemp = 25;
    const hourOfDay = etaTime ? etaTime.getHours() : new Date().getHours();
    const tempVariation = Math.sin((hourOfDay - 6) * Math.PI / 12) * 5; // ±5°C variation
    
    // Simulate different weather conditions based on time of day and location
    const conditions = ['clear sky', 'few clouds', 'scattered clouds', 'broken clouds', 'overcast clouds'];
    
    // Use location and time to create more realistic conditions
    const locationSeed = Math.abs(lat + lng) % 5; // Use coordinates for consistency
    const timeSeed = etaTime ? etaTime.getHours() : new Date().getHours();
    const conditionIndex = (locationSeed + Math.floor(timeSeed / 6)) % conditions.length;
    const condition = conditions[conditionIndex];
    
    // Simulate forecast time that's close to ETA (within 3 hours)
    let forecastTime;
    if (etaTime) {
      // Add random offset between -1.5 to +1.5 hours to simulate forecast accuracy
      const randomOffset = (Math.random() - 0.5) * 3 * 60 * 60 * 1000; // ±1.5 hours
      forecastTime = new Date(etaTime.getTime() + randomOffset);
    } else {
      forecastTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    }
    
    console.log(`🎭 Mock forecast for ETA ${etaTime?.toISOString()}: ${forecastTime.toISOString()}`);
    
    return {
      temperature: Math.round(baseTemp + tempVariation),
      description: condition,
      rain: Math.random() > 0.8, // 20% chance of rain for demo
      humidity: 60 + Math.random() * 30, // 60-90% humidity
      windSpeed: 5 + Math.random() * 15, // 5-20 m/s wind
      forecastTime: forecastTime.toISOString(),
      isForecast: true
    };
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'GarajBaras API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
