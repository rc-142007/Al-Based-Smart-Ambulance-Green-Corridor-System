/**
 * ambulanceLocation.js
 * Start/stop live GPS broadcasting to the server via Socket.IO.
 */

let _watchId = null;

function startLocationTracking(socket, alertId, ambulanceId) {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by this browser.');
    return;
  }
  stopLocationTracking();

  _watchId = navigator.geolocation.watchPosition(
    (position) => {
      const payload = {
        ambulanceId,
        alertId,
        latitude:  position.coords.latitude,
        longitude: position.coords.longitude,
        heading:   position.coords.heading,
        speed:     position.coords.speed,
        timestamp: new Date().toISOString(),
      };
      socket.emit('ambulanceLocation', payload);
      console.log(`📍 Location emitted: ${payload.latitude}, ${payload.longitude}`);
    },
    (error) => { console.error('Geolocation error:', error.message); },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

function stopLocationTracking() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
    console.log('📍 Location tracking stopped.');
  }
}
