const map = L.map('map').setView([16.4023, 120.5960], 15); // Baguio

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// Speed zone example
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

  // Speed zone check
  for (let zone of speedZones) {
    if (zone.area.getBounds().contains([lat, lng])) {
      if (speedKph > zone.speedLimit) {
        if (!speedWarningShown) {
          alert(`⚠️ Slow down! Speed limit in ${zone.name} is ${zone.speedLimit} km/h`);
          speedWarningShown = true;
          setTimeout(() => {
            speedWarningShown = false;
          }, 10000); // prevents spam alerts
        }
      }
    }
  }
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
