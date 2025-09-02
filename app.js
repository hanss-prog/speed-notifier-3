// Initialize map
const map = L.map('map').setView([16.4023, 120.5960], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Speed limits & red zones
const roadsSpeeds = { /* same as before */ };
const redRoads = [ /* same as before */ ];

// Helper to choose color
function getColor(limit, name) {
  if (redRoads.includes(name)) return 'red';
  if (limit === 40) return 'green';
  if (limit === 30) return 'orange';
  if (limit <= 20) return 'yellow';
  return 'blue';
}

// Load GeoJSON roads
let geojsonLayer;
fetch('baguio-roads.geojson')
  .then(res => res.json())
  .then(data => {
    geojsonLayer = L.geoJSON(data, {
      style: f => ({ color: getColor(roadsSpeeds[f.properties.name] || 0, f.properties.name), weight: 5 }),
      onEachFeature: (f, layer) => layer.bindPopup(`${f.properties.name}<br>Speed Limit: ${roadsSpeeds[f.properties.name] || 'Unknown'} km/h`)
    }).addTo(map);
  });

// Enable Notifications button (mobile-friendly)
let notificationsEnabled = false;
const notifBtn = document.createElement('button');
notifBtn.textContent = "Enable Notifications";
notifBtn.style.position = "absolute";
notifBtn.style.top = "10px";
notifBtn.style.right = "10px";
notifBtn.style.zIndex = 1000;
notifBtn.style.padding = "8px 12px";
notifBtn.style.background = "white";
notifBtn.style.borderRadius = "6px";
notifBtn.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
document.body.appendChild(notifBtn);

notifBtn.addEventListener('click', () => {
  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        notificationsEnabled = true;
        notifBtn.remove();
        alert("Notifications enabled! You will get alerts when entering a speed zone.");
      } else {
        alert("Notifications denied. You won't get alerts.");
      }
    });
  }
});

// Location tracking & speed alert
let speedWarningShown = false;
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(onLocationFound, onLocationError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
} else alert("Geolocation not supported by this browser.");

function onLocationFound(position) {
  const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
  document.getElementById('speed').textContent = `${((position.coords.speed || 0) * 3.6).toFixed(1)} km/h`;

  if (!window.userMarker) { window.userMarker = L.marker(userLatLng).addTo(map); map.setView(userLatLng, 17); }
  else window.userMarker.setLatLng(userLatLng);

  if (!window.accuracyCircle) window.accuracyCircle = L.circle(userLatLng, { radius: position.coords.accuracy, color: 'blue', fillOpacity: 0.1 }).addTo(map);
  else window.accuracyCircle.setLatLng(userLatLng).setRadius(position.coords.accuracy);

  if (geojsonLayer) {
    const closest = L.GeometryUtil.closestLayer(map, geojsonLayer.getLayers(), userLatLng);
    if (closest && closest.distance < 10 && !speedWarningShown) {
      const roadName = closest.layer.feature.properties.name;
      const limit = roadsSpeeds[roadName];
      if (limit) {
        alert(`Tips: You've entered a ${limit} km/h zone on ${roadName}`);
        if (notificationsEnabled) {
          new Notification("Speed Zone Alert", { body: `You have entered a ${limit} km/h zone: ${roadName}` });
        }
        speedWarningShown = true;
        setTimeout(() => (speedWarningShown = false), 10000);
      }
    }
  }
}

function onLocationError(err) {
  console.warn(`GPS error (${err.code}): ${err.message}`);
}
