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
  // 🔴 Primary Roads (20 kph)
  "Abanao": 20,
  "Governor Pack Road": 20,
  "Harrison Road": 20,
  "Kayang Street": 20,

  // 🟠 Primary Roads (30 kph)
  "Kennon Road": 30,
  "Quirino Highway": 30,
  "Naguilian Road": 30,

  // 🟠 Secondary Roads (assumed 30 kph for cars/motorcycles)
  "Asin Road": 30,
  "Baguio General Hospital flyover": 30,
  "Chanum Street": 30,
  "Leonard Wood Road": 30,
  "Loakan Road": 30,
  "Magsaysay Avenue": 30,
  "Trinidad Road": 30,
  "Trinidad Road East Service Road": 30,
  "Major Mane Road": 30,
  "Aspiras–Palispis Highway": 30,
  "Pacdal Road": 30,
  "PMA Road": 30,
  "Session Road": 20,
  "Western Link": 40,

  // 🟠 Tertiary Roads (mostly 30 kph for cars/motorcycles)
  "Andres Bonifacio Street": 30,
  "Bokawkan": 30,
  "Country Club Road": 30,
  "Demonstration Road": 30,
  "Engineer’s Hill": 30,
  "F. Calderon Street": 30,
  "Ferguson Road": 30,
  "Gibraltar Road": 30,
  "Gibraltar Road Wye": 30,
  "Harrison Road No. 2": 30,
  "Kayang Extension": 30,
  "Kisad Road": 30,
  "Legarda Road": 30,
  "Leonard Wood": 30,
  "Lt. Tacay": 30,
  "Magsaysay Ave (Trinidad Rd) West Service Road": 30,
  "Manuel Roxas Road": 30,
  "Military Cut-off": 30,
  "North Drive": 30,
  "Outlook Drive": 30,
  "PMA Cut Off Road 1": 30,
  "PMA Cut Off Road 2": 30,
  "Quezon Hill Drive": 30,
  "Quezon Hill Road": 30,
  "Quezon Hill Road #1": 30,
  "South Drive": 30,
  "Sto. Tomas–Mount Cabuyao Road": 30,
  "UP Drive": 30,

  // 🟢 Roads with 40 kph for cars/motorcycles
  "Balatoc Road": 40,
  "Eastern Link Circumferential": 40,

  // 🔴 Roads with 20 kph for all vehicle types
  "Abad Santos Road": 20,
  "Abanao Extension": 20,
  "Chanum": 20,
  "Chuntug #1": 20,
  "Chuntug #2": 20,
  "Fr. F. Carlu Street": 20,
  "General Luna Road": 20,
  "Governor Pack": 20,
  "Government Center Road": 20,
  "Government Center Cut-off": 20,
  "Lake Drive 2": 20,
  "P. Burgos Road": 20,
  "Rimando–Ambiong Road": 20,
  "Yandok Street": 20,
  "Zandueta Street": 20
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

