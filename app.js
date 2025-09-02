// ---------------------------
// Speed Limit Notifier for Thunkable Web Viewer
// ---------------------------

// Initialize map
const map = L.map('map').setView([16.4023, 120.5960], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// Speed segments
const speedSegments = [
  {
    name: "Session Road",
    speedLimit: 30,
    path: [
      [16.40965, 120.59685],[16.40995, 120.59710],[16.41035, 120.59735],
      [16.41075, 120.59745],[16.41105, 120.59755],[16.41145, 120.59765],
      [16.41185, 120.59770]
    ]
  },
  {
    name: "Military Cutoff",
    speedLimit: 40,
    path: [[16.4030,120.5920],[16.4025,120.5930],[16.4020,120.5940]]
  }
];

// Draw segments on the map
const segmentLayers = speedSegments.map(s => ({
  ...s,
  layer: L.polyline(s.path, { color: 'blue', weight: 8 }).addTo(map)
}));

// Red zone roads
const redRoads = [
  "Governor Pack Road", "Harrison Road", "Kayang Street", "Abad Santos Road",
  "Abanao Extension", "Chanum", "Chuntug #1", "Chuntug #2", "Fr. F. Carlu Street",
  "General Luna Road", "Governor Pack", "Government Center Road",
  "Government Center Cut-off", "Lake Drive 2", "P. Burgos Road",
  "Rimando–Ambiong Road", "Yandok Street", "Zandueta Street"
];

// Track if warning has been shown
let speedWarningShown = false;

// Get distance from user to polyline (using Leaflet.GeometryUtil)
function isNearSegment(userLatLng, segmentLayer, threshold = 10) {
  const closest = L.GeometryUtil.closest(map, segmentLayer.getLatLngs(), userLatLng);
  return closest && closest.distance < threshold;
}

// Handle user location
function onLocationFound(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const userLatLng = L.latLng(lat, lng);

  // User marker
  if (!window.userMarker) {
    window.userMarker = L.marker(userLatLng).addTo(map);
    map.setView(userLatLng, 17);
  } else {
    window.userMarker.setLatLng(userLatLng);
  }

  // Accuracy circle
  if (!window.accuracyCircle) {
    window.accuracyCircle = L.circle(userLatLng, {
      radius: position.coords.accuracy,
      color: 'blue',
      fillOpacity: 0.1
    }).addTo(map);
  } else {
    window.accuracyCircle.setLatLng(userLatLng).setRadius(position.coords.accuracy);
  }

  // Check each speed segment
  speedSegments.forEach(s => {
    if (!speedWarningShown && isNearSegment(userLatLng, segmentLayers.find(sl => sl.name === s.name).layer)) {
      speedWarningShown = true;
      
      // Send message to Thunkable
      const message = `You have entered a ${s.speedLimit} km/h zone on ${s.name}`;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(message);
      } else {
        // fallback: browser alert
        alert(message);
      }

      // Reset after 10 seconds
      setTimeout(() => (speedWarningShown = false), 10000);
    }
  });
}

// Handle errors
function onLocationError(err) {
  console.warn(`GPS error (${err.code}): ${err.message}`);
}

// Watch position
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(onLocationFound, onLocationError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });
} else {
  alert("Geolocation not supported by this browser.");
}
