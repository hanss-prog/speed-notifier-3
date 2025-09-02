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

// 🔴 Road-based speed segments (polylines)
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

  // ✅ Check road segment speed zones
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

// 📏 Helper function: Check if user is near a segment
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
