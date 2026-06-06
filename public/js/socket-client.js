/**
 * Socket.IO Client — connects to the server and joins the appropriate room.
 */

let socket = null;

function initSocket(userId, role) {
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => _connectSocket(userId, role);
    document.head.appendChild(script);
  } else {
    _connectSocket(userId, role);
  }
}

function _connectSocket(userId, role) {
  socket = io({ transports: ['websocket', 'polling'] });
  window.socket = socket; // expose globally

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    updateConnectionUI(true);
    if (role === 'ambulance') {
      socket.emit('join:ambulance', userId);
    } else if (role === 'police') {
      socket.emit('join:police', userId);
    }
    // Notify page that socket is ready
    document.dispatchEvent(new CustomEvent('socket:connected', { detail: { userId, role } }));
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
    updateConnectionUI(false);
  });

  // ── Police Events ──────────────────────────────────────────────────────────
  socket.on('ambulance:alert', (data) => {
    console.log('🚨 Ambulance alert received:', data);
    document.dispatchEvent(new CustomEvent('socket:ambulance-alert', { detail: data }));
  });

  socket.on('ambulance:eta_update', (data) => {
    document.dispatchEvent(new CustomEvent('socket:eta-update', { detail: data }));
  });

  socket.on('ambulance:arrived', (data) => {
    document.dispatchEvent(new CustomEvent('socket:arrived', { detail: data }));
    showToast('✅ Ambulance has reached the hospital.', 'success');
  });

  // ── Live Ambulance Location (for police map) ───────────────────────────────
  socket.on('ambulanceLocationUpdate', (data) => {
    console.log('📍 Live location update:', data.latitude, data.longitude);
    document.dispatchEvent(new CustomEvent('socket:ambulance-location', { detail: data }));
  });

  // ── Ambulance Events ───────────────────────────────────────────────────────
  socket.on('alert:created', (data) => {
    document.dispatchEvent(new CustomEvent('socket:alert-created', { detail: data }));
  });

  socket.on('route:updated', (data) => {
    document.dispatchEvent(new CustomEvent('socket:route-updated', { detail: data }));
  });

  socket.on('police:status', (data) => {
    document.dispatchEvent(new CustomEvent('socket:police-status', { detail: data }));
  });
}

function updateConnectionUI(connected) {
  const dots = document.querySelectorAll('#connection-status, #conn-dot');
  dots.forEach(dot => {
    dot.style.background = connected ? 'var(--green-success)' : 'var(--red-hot)';
    dot.style.boxShadow  = connected ? '0 0 8px var(--green-success)' : '0 0 8px var(--red-hot)';
  });

  const statusEls = document.querySelectorAll('#conn-status');
  statusEls.forEach(el => {
    el.textContent = connected ? 'Live' : 'Offline';
    el.style.color = connected ? 'var(--green-success)' : 'var(--red-hot)';
  });
}
