// ── Auth Helpers ───────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (_) {
    return null;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  window.location.href = '/login.html';
}

// ── API Helpers ─────────────────────────────────────────────────────────────────

const API_HEADERS = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

async function apiGet(endpoint) {
  const res = await fetch(endpoint, { headers: API_HEADERS() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

async function apiPost(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: API_HEADERS(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

async function apiPatch(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: API_HEADERS(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

// ── Toast Notifications ────────────────────────────────────────────────────────

function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Format Helpers ────────────────────────────────────────────────────────────

function formatIllness(illnessType) {
  return (illnessType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSeverityBadge(severity) {
  return `<span class="badge badge-${severity}">${severity}</span>`;
}
