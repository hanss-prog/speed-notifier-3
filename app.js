// Initialize map
const map = L.map('map').setView([16.4023, 120.5960], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);


// Legacy manual polylines
const speedSegments = [
  {
    name: "Session Road",
    speedLimit: 30,
    color: "red",
    path: [[16.4110,120.5970],[16.4110,120.5970],[16.4110,120.5970],[16.4110,120.5970],[16.4110,120.5970],[16.4110,120.5970],[16.4105,120.5975],[16.41239,120.59766]]
  },
  {
    name: "Military Cutoff",
    speedLimit: 40,
    color: "orange",
    path: [[16.4037,120.6005],[16.4025,120.5930],[16.4020,120.5940]]
  }
];

const segmentLayers = speedSegments.map(s => ({
  ...s,
  layer: L.polyline(s.path, { color: s.color, weight: 8 }).addTo(map)
}));

// Speed limit mapping by road name
const roadsSpeeds = {
  "Abanao": 20,
  "Governor Pack Road": 20,
  "Harrison Road": 20,
  "Kayang Street": 20,
  "Kennon Road": 30,
  "Quirino Highway": 30,
  "Naguilian Road": 30,
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
  "Balatoc Road": 40,
  "Eastern Link Circumferential": 40,
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

// 🚨 List of red zone roads
const redRoads = [
  "Governor Pack Road",
  "Harrison Road",
  "Kayang Street",
  "Abad Santos Road",
  "Abanao Extension",
  "Chanum",
  "Chuntug #1",
  "Chuntug #2",
  "Fr. F. Carlu Street",
  "General Luna Road",
  "Governor Pack",
  "Government Center Road",
  "Government Center Cut-off",
  "Lake Drive 2",
  "P. Burgos Road",
  "Rimando–Ambiong Road",
  "Yandok Street",
  "Zandueta Street"
];

// ✅ Helper to choose color
function getColor(limit, name) {
  if (redRoads.includes(name)) return 'red';
  if (limit === 40) return 'red';
  if (limit === 30) return 'orange';
  if (limit <= 20) return 'yellow';
  return 'blue';
}

// Load GeoJSON and style
let geojsonLayer;
fetch('baguio-roads.geojson')
  .then(res => res.json())
  .then(data => {
    geojsonLayer = L.geoJSON(data, {
      style: feature => {
        const name = feature.properties.name;
        const limit = roadsSpeeds[name] || 0;
        return { color: getColor(limit, name), weight: 5 };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const limit = roadsSpeeds[name] || 'Unknown';
        layer.bindPopup(`${name}<br>Speed Limit: ${limit} km/h`);
      }
    }).addTo(map);
  });

// ⚡ Speed warning + location tracking
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

  // 🚧 Check GeoJSON road proximity
  if (geojsonLayer) {
    const layerArr = geojsonLayer.getLayers();
    const closest = L.GeometryUtil.closestLayer(map, layerArr, userLatLng);

    if (closest && closest.distance < 10 && !speedWarningShown) {
      const roadName = closest.layer.feature.properties.name;
      const limit = roadsSpeeds[roadName];

      // ✅ Governor Pack Road special notification
      if (roadName === "Governor Pack Road") {
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Zone Alert", {
              body: "You have entered a 20kmph zone road"
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
              if (permission === "granted") {
                new Notification("Zone Alert", {
                  body: "You have entered a 20kmph zone road"
                });
              }
            });
          }
        }
      }

      if (limit) {
        alert(`Tips: You've entered a ${limit} km/h zone on ${roadName}`);

        // 🔔 Notify if red zone
        if (redRoads.includes(roadName) && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Red Zone Alert", {
              body: `You have entered a RED speed zone: ${roadName}`
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
              if (permission === "granted") {
                new Notification("Red Zone Alert", {
                  body: `You have entered a RED speed zone: ${roadName}`
                });
              }
            });
          }
        }

        speedWarningShown = true;
        setTimeout(() => (speedWarningShown = false), 10000);
      }
    }
  }
}

function onLocationError(err) {
  console.warn(`GPS error (${err.code}): ${err.message}`);
  alert("GPS Error: " + err.message);
}
