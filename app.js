// Initialize map
const map = L.map('map').setView([16.4023, 120.5960], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Legacy polygon (can be removed if not needed)
const speedZones = [
  {
    name: "Session Road",
    speedLimit: 30,
    area: L.polygon([
      [16.4115, 120.5965],
      [16.4115, 120.5985],
      [16.4095, 120.5985],
      [16.4095, 120.5965]
    ], { color: 'red' }).addTo(map)
  }
];

// Legacy manual polylines
const speedSegments = [
  { name: "Session Road", speedLimit: 30, color: "red", path: [[16.4115,120.5965],[16.4110,120.5970],[16.4105,120.5975],[16.4100,120.5980]] },
  { name: "Military Cutoff", speedLimit: 40, color: "orange", path: [[16.4030,120.5920],[16.4025,120.5930],[16.4020,120.5940]] }
];
const segmentLayers = speedSegments.map(s => ({ ...s, layer: L.polyline(s.path, { color: s.color, weight: 8 }).addTo(map) }));

// Speed limit mapping by road name
const roadsSpeeds = {
  "Session Road": 30,
  // (Add your comprehensive road list here with their limits)
};

// Helper to choose color based on speed limit
function getColor(limit) {
  if (limit <= 20) return 'red';
  if (limit === 30) return 'orange';
  if (limit === 40) return 'green';
  return 'blue';
}

// Load GeoJSON roads, style them, and keep a reference for proximity checks
let geojsonLayer;
fetch('baguio-roads.geojson')
  .then(res => res.json())
  .then(data => {
    geojsonLayer = L.geoJSON(data, {
      style: feature => {
        const name = feature.properties.name;
        const limit = roadsSpeeds[name] || 0;
        return { color: getColor(limit), weight: 5 };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const limit = roadsSpeeds[name] || 'Unknown';
        layer.bindPopup(`${name}<br>Speed Limit: ${limit} km/h`);
      }
    }).addTo(map);
  });

// Use GeometryUtil to detect proximity
// Make sure to include Leaflet.GeometryUtil via script in HTML

let speedWarningShown = false;

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(onLocationFound, onLocationError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });
} else {
  alert("Geolocation not supported by this browser.");
}

function onLocationFound(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const speedKph = (position.coords.speed || 0) * 3.6;
  document.getElementById('speed').textContent = `${speedKph.toFixed(1)} km/h`;

  const userLatLng = L.latLng(lat, lng);

  if (!window.userMarker) {
    window.userMarker = L.marker(userLatLng).addTo(map);
    map.setView(userLatLng, 17);
  } else {
    window.userMarker.setLatLng(userLatLng);
  }

  if (!window.accuracyCircle) {
    window.accuracyCircle = L.circle(userLatLng, {
      radius: position.coords.accuracy,
      color: 'blue',
      fillOpacity: 0.1
    }).addTo(map);
  } else {
    window.accuracyCircle
      .setLatLng(userLatLng)
      .setRadius(position.coords.accuracy);
  }

  // Check GeoJSON roads proximity
  if (geojsonLayer) {
    const layerArr = geojsonLayer.getLayers();
    const closest = L.GeometryUtil.closestLayer(map, layerArr, userLatLng);
    if (closest && closest.distance < 10 && !speedWarningShown) {
      const roadName = closest.layer.feature.properties.name;
      const limit = roadsSpeeds[roadName];
      if (limit) {
        alert(`Tips: You've entered a ${limit} km/h zone on ${roadName}`);
        speedWarningShown = true;
        setTimeout(() => (speedWarningShown = false), 10000);
      }
    }
  }

  // Additional checks for polygons or manual segments if desired
}

function onLocationError(err) {
  console.warn(`GPS error (${err.code}): ${err.message}`);
  alert("GPS Error: " + err.message);
}

