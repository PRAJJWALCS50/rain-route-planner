import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const RADAR_TEMPLATES = [
  // Allow override via env
  process.env.REACT_APP_RADAR_TILE_URL_TEMPLATE || '',
  // RainViewer variants (try in order)
  'https://tilecache.rainviewer.com/v2/radar/nowcast/256/{z}/{x}/{y}/2/1_1.png',
  'https://tilecache.rainviewer.com/v2/radar/nowcast_0/256/{z}/{x}/{y}/2/1_1.png',
  'https://tilecache.rainviewer.com/v2/radar/last/256/{z}/{x}/{y}/2/1_1.png'
].filter(Boolean);

const MapView = ({ routePath = [], alerts = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [22.9734, 78.6569], // India approx center
        zoom: 5,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);

      // Radar overlay with fallback templates
      const tryTemplates = [...RADAR_TEMPLATES];
      const addRadarFromTemplate = () => {
        if (tryTemplates.length === 0) return; // give up silently
        const tpl = tryTemplates.shift();
        const layer = L.tileLayer(tpl, {
          opacity: 0.6,
          zIndex: 400,
          tileSize: 256,
          crossOrigin: true
        });
        let anyTileLoaded = false;
        const successOnce = () => { anyTileLoaded = true; layer.off('tileload', successOnce); };
        const onErr = () => {
          // if nothing loaded yet, fallback to next template
          setTimeout(() => {
            if (!anyTileLoaded) {
              layer.remove();
              addRadarFromTemplate();
            }
          }, 200);
        };
        layer.on('tileload', successOnce);
        layer.on('tileerror', onErr);
        layer.addTo(mapInstanceRef.current);
      };
      addRadarFromTemplate();
    }

    // Clear previous layers
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Draw route
    if (routePath.length > 1) {
      const latlngs = routePath.map(p => [p.lat, p.lng]);
      routeLayerRef.current = L.polyline(latlngs, { color: '#4f46e5', weight: 5, opacity: 0.8 }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [20, 20] });
    }

    // Draw markers
    alerts.forEach(a => {
      if (!a.coords) return;
      const isRain = a.severity === 'high';
      const marker = L.circleMarker([a.coords.lat, a.coords.lng], {
        radius: 6,
        color: isRain ? '#dc2626' : '#16a34a',
        fillColor: isRain ? '#ef4444' : '#22c55e',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(mapInstanceRef.current);

      const popupHtml = `
        <div style="min-width:200px">
          <strong>${a.location}</strong><br/>
          ${a.alert}<br/>
          <div style="margin-top:6px;font-size:12px;">
            ${a.weatherData ? `Temp: ${a.weatherData.temperature}&deg;C | ${a.weatherData.description}` : 'Weather: N/A'}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      markersRef.current.push(marker);
    });
  }, [routePath, alerts]);

  return (
    <div style={{ height: '420px', width: '100%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} ref={mapRef} />
  );
};

export default MapView;
