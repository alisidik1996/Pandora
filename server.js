/**
 * =============================================================
 *  PANDORA BOX GAME — Node.js Static File Server + REST API
 *  Port  : 6161
 *  Akses : http://localhost:6161/
 *          atau http://<IP-lokal>:6161/ (dari HP)
 *
 *  Jalankan:
 *    npm start              (node server.js)
 *    npm run dev            (node --watch server.js)
 *
 *  API Endpoints:
 *    POST /api/login        { name, password } → { team, token }
 *    POST /api/save         { ...progress }   → { success }   [Auth]
 *    GET  /api/leaderboard                    → [{ name, duration, panicCount }]
 * =============================================================
 */

import http from 'node:http';
import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath }  from 'node:url';
import { networkInterfaces } from 'node:os';
import {
  login,
  register,
  validateSession,
  saveProgress,
  getProgress,
  getLeaderboard,
  getGlobalPanicCount,
} from './db.js';

// ── Konfigurasi ───────────────────────────────────────────────
const PORT           = 6161;
const ROOT           = path.dirname(fileURLToPath(import.meta.url));
const INDEX          = 'index.html';
const MAX_BODY_SIZE  = 100_000; // 100KB

// ── MIME types ────────────────────────────────────────────────
const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css; charset=utf-8',
  '.js'   : 'application/javascript; charset=utf-8',
  '.json' : 'application/json; charset=utf-8',
  '.ico'  : 'image/x-icon',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.svg'  : 'image/svg+xml',
  '.woff2': 'font/woff2',
};

// ── Helpers ───────────────────────────────────────────────────
const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const readBody = req => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', chunk => {
    if (body.length + chunk.length > MAX_BODY_SIZE) {
      req.destroy();
      reject(new Error('Body terlalu besar'));
      return;
    }
    body += chunk;
  });
  req.on('end',  ()    => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (e) {
      reject(new Error('JSON tidak valid'));
    }
  });
  req.on('error', reject);
});

const getToken = req => {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
};

// Simple rate limiter: IP → { count, resetAt }
const _rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 menit
const RATE_LIMIT_MAX    = 10;     // 10 login attempts per IP per menit

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _rateLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    _rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Cleanup rate limit map setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of _rateLimits.entries()) {
    if (now > entry.resetAt) _rateLimits.delete(ip);
  }
}, 5 * 60_000);

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') { res.writeHead(404); res.end('404 – Tidak ditemukan'); }
      else                       { res.writeHead(500); res.end('500 – Server error'); }
      return;
    }
    const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const headers = {
      'Content-Type'                       : mime,
      'Cache-Control'                      : 'no-cache',
      'Cross-Origin-Opener-Policy'         : 'same-origin',
      'Cross-Origin-Embedder-Policy'       : 'require-corp',
    };

    // CSP untuk HTML
    if (mime.includes('text/html')) {
      headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
    }

    res.writeHead(200, headers);
    res.end(data);
  });
}

// ── API Router ────────────────────────────────────────────────
async function handleAPI(req, res) {
  const url    = new URL(req.url, 'http://localhost');
  const method = req.method;

  // POST /api/login
  if (url.pathname === '/api/login' && method === 'POST') {
    const ip = req.socket.remoteAddress;
    if (!checkRateLimit(ip)) {
      return json(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi nanti.' });
    }
    const { name, password } = await readBody(req);
    if (!name || !password) return json(res, 400, { error: 'Nama dan password wajib diisi.' });
    const result = await login(name, password);
    return json(res, result.success ? 200 : 401, result);
  }

  // POST /api/register
  if (url.pathname === '/api/register' && method === 'POST') {
    const { name, password } = await readBody(req);
    if (!name || !password) return json(res, 400, { error: 'Nama dan password wajib diisi.' });
    const result = await register(name, password);
    return json(res, result.success ? 200 : 400, result);
  }

  // POST /api/save — simpan progress (perlu token)
  if (url.pathname === '/api/save' && method === 'POST') {
    const token  = getToken(req);
    const teamId = token ? await validateSession(token) : null;
    if (!teamId) return json(res, 401, { error: 'Sesi tidak valid, silakan login ulang.' });
    const body = await readBody(req);
    const result = await saveProgress(teamId, body);
    return json(res, 200, result);
  }

  // GET /api/leaderboard — publik
  if (url.pathname === '/api/leaderboard' && method === 'GET') {
    return json(res, 200, await getLeaderboard());
  }

  // GET /api/panic-count — global panic count untuk semua tim aktif
  if (url.pathname === '/api/panic-count' && method === 'GET') {
    const count = await getGlobalPanicCount();
    return json(res, 200, { count });
  }

  // GET /api/progress — ambil progress tim (perlu token)
  if (url.pathname === '/api/progress' && method === 'GET') {
    const token  = getToken(req);
    const teamId = token ? await validateSession(token) : null;
    if (!teamId) return json(res, 401, { error: 'Sesi tidak valid, silakan login ulang.' });
    const team = await getProgress(teamId);
    if (!team) return json(res, 404, { error: 'Tim tidak ditemukan.' });
    return json(res, 200, { team });
  }

  return json(res, 404, { error: 'API endpoint tidak ditemukan.' });
}

// ── Static File Handler ───────────────────────────────────────
function handleStatic(req, res) {
  let urlPath = new URL(req.url, 'http://localhost').pathname;
  try { urlPath = decodeURIComponent(urlPath); } catch { /* biarkan */ }
  if (urlPath === '/' || urlPath === '') urlPath = '/' + INDEX;

  const filePath = path.resolve(ROOT, urlPath.slice(1)); // resolve langsung, tidak pakai normalize

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('403 – Akses ditolak');
    return;
  }
  serveFile(res, filePath);
}

// ── Main Request Handler ──────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' }); res.end(); return;
  }

  const ts = new Date().toLocaleTimeString('id-ID');
  console.log(`[${ts}] ${req.method} ${req.url}`);

  if (req.url.startsWith('/api/')) {
    try { await handleAPI(req, res); }
    catch (e) { console.error('API error:', e); json(res, 500, { error: 'Internal server error' }); }
  } else {
    handleStatic(req, res);
  }
});

// ── Start ─────────────────────────────────────────────────────
// Local development
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📦  Pandora Box Game — Server Aktif');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Komputer  : http://localhost:${PORT}/`);
    const nets = networkInterfaces();
    for (const iface of Object.values(nets)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal)
          console.log(`  HP/tablet : http://${addr.address}:${PORT}/`);
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Ctrl+C untuk menghentikan\n');
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE')
      console.error(`\n❌  Port ${PORT} sudah dipakai.\n`);
    else
      console.error('\n❌  Server error:', err.message);
    process.exit(1);
  });
}

// ── Vercel Serverless Export ──────────────────────────────────
export default async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' });
    res.end();
    return;
  }

  if (req.url.startsWith('/api/')) {
    try { await handleAPI(req, res); }
    catch (e) {
      console.error('API error:', e);
      json(res, 500, { error: 'Internal server error' });
    }
  } else {
    handleStatic(req, res);
  }
};
