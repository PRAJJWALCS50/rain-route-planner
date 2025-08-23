const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenRouteService API configuration
const OPENROUTE_API_KEY = process.env.OPENROUTE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo'; // OpenWeatherMap API key

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

if (!OPENROUTE_API_KEY) {
  console.warn('OPENROUTE_API_KEY is not set. Routing requests will fail. Set it in your .env file.');
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
        duration: Math.round(durationAtPoint)
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
      headers: { 'User-Agent': 'Rain-Route-Planner/1.0 (contact: example@example.com)' }
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

// Route to get route information and weather alerts
app.post('/api/check-route', async (req, res) => {
  try {
    const { source, destination, departureTime } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    // Get route from OpenRouteService API
    const routeData = await getRouteFromOpenRoute(source, destination);
    
    if (!routeData) {
      console.error('Route generation returned empty response', { source, destination });
      return res.status(502).json({ error: 'Failed to get route information' });
    }

    // Get weather data for each waypoint
    const weatherAlerts = await getWeatherAlerts(routeData.waypoints, departureTime);
    
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
async function getRouteFromOpenRoute(source, destination) {
  try {
    // First, geocode the source and destination cities to get coordinates
    const sourceCoords = await geocodeCity(source);
    const destCoords = await geocodeCity(destination);
    
    if (!sourceCoords || !destCoords) {
      throw new Error('Could not geocode cities');
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
        duration: 0
      });

      // Generate evenly spaced waypoints every ~3 km using geometry polyline only
      const intervalMeters = 3000; // 3 km
      if (Array.isArray(geometryCoords) && geometryCoords.length > 1) {
        const evenWaypoints = generateWaypointsByDistance(
          geometryCoords,
          intervalMeters,
          (properties.summary && properties.summary.distance) || properties.distance || 0,
          (properties.summary && properties.summary.duration) || properties.duration || 0
        );
        console.log('Even waypoint stats:', {
          intervalMeters,
          geometryPoints: geometryCoords.length,
          generated: evenWaypoints.length,
          totalDistance: (properties.summary && properties.summary.distance) || properties.distance || 0,
          totalDuration: (properties.summary && properties.summary.duration) || properties.duration || 0
        });
        waypoints.push(...evenWaypoints);
      }

      // Add destination
      waypoints.push({
        name: destination,
        location: { lat: destCoords.lat, lng: destCoords.lng },
        arrivalTime: null,
        duration: properties.summary && typeof properties.summary.duration === 'number' ? properties.summary.duration : (properties.duration || 0)
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
    const url = `https://api.openrouteservice.org/geocode/search`;
    const params = {
      text: cityName + ', India',
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
      return {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
      };
    }
    
    // Fallback to Nominatim if ORS geocoding yields nothing
    const nom = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${cityName}, India`,
        format: 'json',
        limit: 1,
        addressdetails: 0
      },
      headers: {
        'User-Agent': 'Rain-Route-Planner/1.0 (contact: example@example.com)'
      }
    });
    if (Array.isArray(nom.data) && nom.data.length > 0) {
      return {
        lat: parseFloat(nom.data[0].lat),
        lng: parseFloat(nom.data[0].lon)
      };
    }
    return null;
  } catch (error) {
    logAxiosError(error, 'Geocoding error');
    // Return mock coordinates for demo purposes
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
      'lucknow': { lat: 26.8467, lng: 80.9462 }
    };
    
    const cityKey = cityName.toLowerCase();
    return mockCities[cityKey] || { lat: 20.5937, lng: 78.9629 }; // Default to India center
  }
}

// Function to get weather alerts for waypoints
async function getWeatherAlerts(waypoints, departureTime) {
  const alerts = [];
  const departureDate = new Date(departureTime || Date.now());
  
  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];
    const arrivalTime = new Date(departureDate.getTime() + (waypoint.duration * 1000));
    
    // Update waypoint with arrival time
    waypoint.arrivalTime = arrivalTime;
    
    try {
      // Get weather data for the location
      const weather = await getWeatherData(waypoint.location.lat, waypoint.location.lng);
      
      if (weather && weather.rain) {
        alerts.push({
          location: waypoint.name,
          arrivalTime: arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          alert: `Rain Alert: Expect rains in ${waypoint.name} at ${arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}.`,
          severity: 'high',
          weatherData: weather,
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
          alert: `Clear weather expected in ${waypoint.name} at ${arrivalTime.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}.`,
          severity: 'low',
          weatherData: weather,
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
        weatherData: null,
        coords: { lat: waypoint.location.lat, lng: waypoint.location.lng }
      });
    }
  }
  
  return alerts;
}

// Function to get weather data from OpenWeatherMap API
async function getWeatherData(lat, lng) {
  try {
    // Using OpenWeatherMap API as a fallback since IMD doesn't have public APIs
    const url = `https://api.openweathermap.org/data/2.5/weather`;
    const params = {
      lat: lat,
      lon: lng,
      appid: WEATHER_API_KEY,
      units: 'metric'
    };

    const response = await axios.get(url, { params });
    
    if (response.data && response.data.weather) {


      
      return {
        temperature: response.data.main.temp,
        description: response.data.weather[0].description,
        rain: response.data.rain && response.data.rain['1h'] > 0,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed
      };
    }
    
    return null;
  } catch (error) {
    console.error('Weather API error:', error);
    // Return mock data for demo purposes
    return {
      temperature: 25,
      description: 'Partly cloudy',
      rain: Math.random() > 0.7, // 30% chance of rain for demo
      humidity: 65,
      windSpeed: 12
    };
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Rain Route Planner API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
