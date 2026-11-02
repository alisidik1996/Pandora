/**
 * =============================================================
 *  MODULE: API (client-side)
 *  Tanggung jawab: Semua komunikasi dengan REST API server.
 *  Token sesi disimpan di sessionStorage (hilang saat tab ditutup).
 * =============================================================
 */

const BASE = '';  // same-origin, tidak perlu host prefix

// ── Token management ──────────────────────────────────────────

export function getToken()         { return localStorage.getItem('pb_token'); }
export function setToken(t)        { localStorage.setItem('pb_token', t); }
export function clearToken()       { localStorage.removeItem('pb_token'); }

function _authHeader() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

// ── Fetch helper ──────────────────────────────────────────────

async function _post(endpoint, body = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeader() },
    body:    JSON.stringify(body),
  });
  return res.json();
}

async function _get(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { ..._authHeader() },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// ── Public API calls ──────────────────────────────────────────

/**
 * Login - tim harus sudah terdaftar.
 * @returns {{ success, team, token } | { success, error }}
 */
export async function login(name, password) {
  const data = await _post('/api/login', { name, password });
  if (data.success && data.token) {
    setToken(data.token);
  } else if (!data.success) {
    clearToken();
  }
  return data;
}

/**
 * Register - daftar tim baru.
 * @returns {{ success, team, token } | { success, error }}
 */
export async function register(name, password) {
  const data = await _post('/api/register', { name, password });
  if (data.success && data.token) {
    setToken(data.token);
  }
  return data;
}

/**
 * Simpan seluruh progress tim ke server.
 * Fire-and-forget (error tidak dilempar ke UI).
 */
export async function saveProgress(teamData) {
  try {
    await _post('/api/save', {
      locks:      teamData.locks,
      lockOrder:  teamData.lockOrder,
      panicCount: teamData.panicCount,
      finished:   teamData.finished,
      duration:   teamData.duration,
    });
  } catch (e) {
    console.warn('saveProgress gagal (offline?):', e.message);
  }
}

/**
 * Ambil leaderboard dari server.
 * @returns {Array<{ name, duration, panicCount }>}
 */
export async function fetchLeaderboard() {
  try {
    const data = await _get('/api/leaderboard');
    return Array.isArray(data) ? data : [];
  }
  catch (e) {
    console.error('fetchLeaderboard error:', e);
    return [];
  }
}

/**
 * Ambil global panic count dari server.
 * @returns {Promise<number>}
 */
export async function fetchGlobalPanicCount() {
  try {
    const data = await _get('/api/panic-count');
    return data.count || 0;
  }
  catch {
    return 0;
  }
}
