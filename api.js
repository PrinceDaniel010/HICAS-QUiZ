const BASE = '/api';

function tokenHeader() {
  const token = localStorage.getItem('quiz_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function adminTokenHeader() {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  register: (payload) =>
    fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),

  me: () => fetch(`${BASE}/register/me`, { headers: tokenHeader() }).then(handle),

  status: () => fetch(`${BASE}/quiz/status`, { headers: tokenHeader() }).then(handle),

  startRound: (round) =>
    fetch(`${BASE}/quiz/round/${round}/start`, { method: 'POST', headers: tokenHeader() }).then(handle),

  answer: (round, payload) =>
    fetch(`${BASE}/quiz/round/${round}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify(payload),
    }).then(handle),

  roundResult: (round) => fetch(`${BASE}/quiz/round/${round}/result`, { headers: tokenHeader() }).then(handle),

  adminLogin: (payload) =>
    fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),

  adminGet: (path) => fetch(`${BASE}/admin${path}`, { headers: adminTokenHeader() }).then(handle),

  adminPost: (path, payload) =>
    fetch(`${BASE}/admin${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminTokenHeader() },
      body: JSON.stringify(payload),
    }).then(handle),

  adminPut: (path, payload) =>
    fetch(`${BASE}/admin${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminTokenHeader() },
      body: JSON.stringify(payload),
    }).then(handle),

  adminDelete: (path) =>
    fetch(`${BASE}/admin${path}`, { method: 'DELETE', headers: adminTokenHeader() }).then(handle),
};
