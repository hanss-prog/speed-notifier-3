const map = L.map('map').setView([16.4023, 120.5960], 15); // Baguio

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// Polygon-based speed zone (can be removed if using only road segments)
const speedZones = [
  {
    name: "Session Road",
    speedLimit: 30, // km/h
    area: L.polygon([
      [16.4115, 120.5965],
      [16.4115, 120.5985],
      [16.4095, 120.5985],
      [16.4095, 120.5965]
    ], { color: 'red' }).addTo(map)
  }
];

// 🔴 Road-based speed segments (manual polylines)
const speedSegments = [
  {
    name: "Session Road",
    speedLimit: 30,
    color: "red",
    path: [
      [16.4115, 120.5965],
      [16.4110, 120.5970],
      [16.4105, 120.5975],
      [16.4100, 120.5980]
    ]
  },
  {
    name: "Military Cutoff",
    speedLimit: 40,
    color: "orange",
    path: [
      [16.4030, 120.5920],
      [16.4025, 120.5930],
      [16.4020, 120.5940]
    ]
  }
];

const segmentLayers = speedSegments.map(segment => {
  return {
    ...segment,
    layer: L.polyline(segment.path, { color: segment.color, weight: 8 }).addTo(map)
  };
});

// Roads and their speed limits
const roadsSpeeds = {
  // Primary Roads (20 kph)
  "Abanao": 20, "Governor Pack Road": 20, "Harrison Road": 20, "Kayang Street": 20,
  // Primary Roads (30 kph)
  "Kennon Road":30, "Quirino Highway":30, "Naguilian Road":30,
  // Secondary roads
  "Asin Road":30, "Baguio General Hospital flyover":30, "Chanum Street":30,
  "Leonard Wood Road":30, "Loakan Road":30, "Magsaysay Avenue":30,
  "Trinidad Road":30, "Major Mane Road":30, "Aspiras–Palispis Highway":30,
  "Pacdal Road":30, "Session Road":20, "Western Link":40,
  // Tertiary roads
  "Military Cut-off":30, "Andres Bonifacio Street":30, "Bokawkan Road":30,
  "Country Club Road":30, "Demonstration Road":30, "Gibraltar Road":30,
  "Harrison Road No. 2":30, "Kayang Extension":30, "Kisad Road":30,
  "Legarda Road":30, "Lt. Tacay":30, "Manuel Roxas Road":30,
  "North Drive":30, "Outlook Drive":30, "PMA Road":30,
  "Quezon Hill Drive":30, "South Drive":30, "Sto. Tomas–Mount Cabuyao Road":30,
  "UP Drive":30,
  "Balatoc Road":40, "Eastern Link Circumferential":40,
  "Abad Santos Road":20, "Abanao Extension":20, "Chuntug":20,
  "Fr. F. Carlu Street":20, "General Luna Road":20, "Government Center Road":20,
  "Rimando–Ambiong Road":20, "Yandok Street":20, "Zandueta Street":20
};

// Color function by speed limit
function getColor(limit) {
  if (limit <= 20) return 'red';
  if (limit === 30) return 'orange';
  if (limit === 40) return 'green';
  return 'blue';
}

// Load external Baguio roads from GeoJSON and color them by speed limit
fetch('baguio-roads.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      style: feature => {
        const name = feature.properties.name;
        const speedLimit = roadsSpeeds[name] || 25; // Default if unknown
        return { color: getColor(speedLimit), weight: 4 };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const speedLimit = roadsSpeeds[name] || 25;
        layer.bindPopup(`${name}<br>Speed Limit: ${speedLimit} km/h`);
      }
    }).addTo(map);
  });

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
  const speed = position.coords.speed || 0; // meters/second

  const speedKph = (speed * 3.6).toFixed(1); // Convert to km/h
  document.getElementById('speed').textContent = `${speedKph} km/h`;

  // Add or update user marker
  if (!window.userMarker) {
    window.userMarker = L.marker([lat, lng]).addTo(map);
    map.setView([lat, lng], 17);
  } else {
    window.userMarker.setLatLng([lat, lng]);
  }

  // Optional: show accuracy circle
  if (!window.accuracyCircle) {
    window.accuracyCircle = L.circle([lat, lng], {
      radius: position.coords.accuracy,
      color: 'blue',
      fillOpacity: 0.1
    }).addTo(map);
  } else {
    window.accuracyCircle.setLatLng([lat, lng]);
    window.accuracyCircle.setRadius(position.coords.accuracy);
  }

  // Check polygon speed zones
  for (let zone of speedZones) {
    if (zone.area.getBounds().contains([lat, lng])) {
      if (speedKph > zone.speedLimit && !speedWarningShown) {
        alert(`⚠️ Slow down! Speed limit in ${zone.name} is ${zone.speedLimit} km/h`);
        speedWarningShown = true;
        setTimeout(() => {
          speedWarningShown = false;
        }, 10000);
      }
    }
  }

  // Check manual road segments speed zones
  for (let segment of segmentLayers) {
    if (isNearSegment(lat, lng, segment.path)) {
      if (speedKph > segment.speedLimit && !speedWarningShown) {
        alert(`⚠️ Slow down! Speed limit on ${segment.name} is ${segment.speedLimit} km/h`);
        speedWarningShown = true;
        setTimeout(() => {
          speedWarningShown = false;
        }, 10000);
      }
    }
  }
}

// Helper: Check if user is near a polyline segment
function isNearSegment(lat, lng, path, maxDistance = 20) {
  const point = L.latLng(lat, lng);
  for (let i = 0; i < path.length - 1; i++) {
    const seg = L.polyline([path[i], path[i + 1]]);
    const dist = point.distanceTo(seg.getCenter());
    if (dist < maxDistance) return true;
  }
  return false;
}

function onLocationError(error) {
  console.warn(`Geolocation error (${error.code}): ${error.message}`);

  const messages = {
    1: "Permission denied. Please allow location access.",
    2: "Position unavailable. Try moving to a clearer area.",
    3: "Location request timed out. Try again.",
  };

  alert("GPS error: " + (messages[error.code] || "Unknown error occurred."));
}
