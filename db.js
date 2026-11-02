/**
 * =============================================================
 *  MODULE: Database (server-side)
 *  Engine : Neon PostgreSQL (serverless)
 *
 *  Tabel:
 *    teams    — data tim, progress, status selesai
 *    sessions — token sesi login (1 tim bisa punya banyak token)
 * =============================================================
 */

import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);

// ── Schema Init ───────────────────────────────────────────────
let schemaInitialized = false;

async function initSchema() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id            SERIAL PRIMARY KEY,
        name          TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        start_time    BIGINT NOT NULL,
        locks         JSONB NOT NULL DEFAULT '{"l1":false,"l2":false,"l3":false,"l4":false,"l5":false,"l6":false}',
        lock_order    JSONB NOT NULL DEFAULT '[]',
        panic_count   INTEGER NOT NULL DEFAULT 0,
        flappy_digits JSONB,
        finished      BOOLEAN NOT NULL DEFAULT false,
        duration      BIGINT NOT NULL DEFAULT 0,
        created_at    BIGINT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_team ON sessions(team_id)`;

    schemaInitialized = true;
    console.log('[DB] Schema initialized');
  } catch (err) {
    console.error('[DB] Schema init error:', err.message);
  }
}

async function ensureSchema() {
  if (schemaInitialized) return;
  await initSchema();
}

// Init on startup (non-blocking)
initSchema();

// ── Helpers ───────────────────────────────────────────────────
const SALT = 'pandora-box-2026-salt-v1'; // ponytail: per-user salt better, add when scale
const hashPwd   = pwd  => crypto.scryptSync(pwd, SALT, 32).toString('hex');
const makeToken = ()   => crypto.randomBytes(32).toString('hex');

function timingSafeCompare(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function _row(team) {
  return {
    id:           team.id,
    name:         team.name,
    startTime:    Number(team.start_time),
    locks:        team.locks,
    lockOrder:    team.lock_order,
    panicCount:   team.panic_count,
    flappyDigits: team.flappy_digits,
    finished:     team.finished,
    duration:     Number(team.duration),
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Login - tim harus sudah ada.
 * @returns {{ success, team, token } | { success, error }}
 */
export async function login(name, password) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM teams WHERE LOWER(name) = LOWER(${name.trim()})`;

  if (rows.length === 0) {
    return { success: false, error: 'Tim tidak ditemukan.' };
  }

  const existing = rows[0];
  if (!timingSafeCompare(existing.password_hash, hashPwd(password))) {
    return { success: false, error: 'Password salah.' };
  }

  const token = makeToken();
  await sql`INSERT INTO sessions (token, team_id, created_at) VALUES (${token}, ${existing.id}, ${Date.now()})`;

  return { success: true, team: _row(existing), token };
}

/**
 * Register - tim belum boleh ada.
 * @returns {{ success, team, token } | { success, error }}
 */
export async function register(name, password) {
  await ensureSchema();
  const rows = await sql`SELECT id FROM teams WHERE LOWER(name) = LOWER(${name.trim()})`;

  if (rows.length > 0) {
    return { success: false, error: 'Nama tim sudah dipakai.' };
  }

  const now = Date.now();
  const result = await sql`
    INSERT INTO teams (name, password_hash, start_time, created_at)
    VALUES (${name.trim()}, ${hashPwd(password)}, ${now}, ${now})
    RETURNING *
  `;

  const team = result[0];
  const token = makeToken();
  await sql`INSERT INTO sessions (token, team_id, created_at) VALUES (${token}, ${team.id}, ${now})`;

  return { success: true, team: _row(team), token };
}

/**
 * Validasi token sesi → kembalikan teamId atau null.
 */
export async function validateSession(token) {
  await ensureSchema();
  const rows = await sql`SELECT team_id FROM sessions WHERE token = ${token}`;
  return rows.length > 0 ? rows[0].team_id : null;
}

/**
 * Simpan progress tim ke database.
 */
export async function saveProgress(teamId, data) {
  await ensureSchema();
  await sql`
    UPDATE teams SET
      locks = ${JSON.stringify(data.locks)},
      lock_order = ${JSON.stringify(data.lockOrder)},
      panic_count = ${data.panicCount ?? 0},
      flappy_digits = ${data.flappyDigits ? JSON.stringify(data.flappyDigits) : null},
      finished = ${data.finished ?? false},
      duration = ${data.duration ?? 0}
    WHERE id = ${teamId}
  `;
  return { success: true };
}

/**
 * Ambil progress tim berdasarkan teamId.
 */
export async function getProgress(teamId) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM teams WHERE id = ${teamId}`;
  return rows.length > 0 ? _row(rows[0]) : null;
}

/**
 * Leaderboard: tim yang sudah selesai, diurutkan dari durasi tercepat.
 */
export async function getLeaderboard() {
  await ensureSchema();
  const rows = await sql`
    SELECT name, duration, panic_count
    FROM teams
    WHERE finished = true
    ORDER BY duration ASC
    LIMIT 50
  `;
  return rows.map(r => ({
    name:       r.name,
    duration:   Number(r.duration),
    panicCount: r.panic_count,
  }));
}

/**
 * Get global panic count (sum semua tim).
 */
export async function getGlobalPanicCount() {
  await ensureSchema();
  const rows = await sql`SELECT COALESCE(SUM(panic_count), 0) as total FROM teams WHERE finished = false`;
  return Number(rows[0].total);
}
