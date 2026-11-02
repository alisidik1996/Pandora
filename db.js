/**
 * =============================================================
 *  MODULE: Database (server-side)
 *  Engine : node:sqlite (built-in, Node >= 22.5)
 *  File   : data/pandora.db  (auto-dibuat saat pertama kali)
 *
 *  Tabel:
 *    teams    — data tim, progress, status selesai
 *    sessions — token sesi login (1 tim bisa punya banyak token)
 * =============================================================
 */

import { DatabaseSync } from 'node:sqlite';
import crypto           from 'node:crypto';
import fs               from 'node:fs';
import path             from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Path database ─────────────────────────────────────────────
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const DB_PATH = path.join(DIR, 'pandora.db');

const db = new DatabaseSync(DB_PATH);

// ── Schema ────────────────────────────────────────────────────
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS teams (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    start_time    INTEGER NOT NULL,
    locks         TEXT    NOT NULL DEFAULT '{"l1":false,"l2":false,"l3":false,"l4":false,"l5":false,"l6":false}',
    lock_order    TEXT    NOT NULL DEFAULT '[]',
    panic_count   INTEGER NOT NULL DEFAULT 0,
    flappy_digits TEXT,
    finished      INTEGER NOT NULL DEFAULT 0,
    duration      INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    team_id    INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );
`);

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
  const parseSafe = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };
  return {
    id:           team.id,
    name:         team.name,
    startTime:    team.start_time,
    locks:        parseSafe(team.locks, {l1:false,l2:false,l3:false,l4:false,l5:false,l6:false}),
    lockOrder:    parseSafe(team.lock_order, []),
    panicCount:   team.panic_count,
    flappyDigits: team.flappy_digits ? parseSafe(team.flappy_digits, null) : null,
    finished:     team.finished === 1,
    duration:     team.duration,
  };
}

function _byId(id) {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
}

function _newSession(teamId) {
  const token = makeToken();
  db.prepare('INSERT INTO sessions (token, team_id, created_at) VALUES (?, ?, ?)').run(token, teamId, Date.now());
  return token;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Login - tim harus sudah ada.
 * @returns {{ success, team, token } | { success, error }}
 */
export function login(name, password) {
  const existing = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(name.trim());

  if (!existing) {
    return { success: false, error: 'Tim tidak ditemukan.' };
  }

  if (!timingSafeCompare(existing.password_hash, hashPwd(password))) {
    return { success: false, error: 'Password salah.' };
  }

  const token = _newSession(existing.id);
  return { success: true, team: _row(existing), token };
}

/**
 * Register - tim belum boleh ada.
 * @returns {{ success, team, token } | { success, error }}
 */
export function register(name, password) {
  const existing = db.prepare('SELECT * FROM teams WHERE LOWER(name) = LOWER(?)').get(name.trim());

  if (existing) {
    return { success: false, error: 'Nama tim sudah dipakai.' };
  }

  const now  = Date.now();
  const stmt = db.prepare(`
    INSERT INTO teams (name, password_hash, start_time, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const res   = stmt.run(name.trim(), hashPwd(password), now, now);
  const team  = _byId(res.lastInsertRowid);
  const token = _newSession(team.id);
  return { success: true, team: _row(team), token };
}

/**
 * Validasi token sesi → kembalikan teamId atau null.
 */
export function validateSession(token) {
  const row = db.prepare('SELECT team_id FROM sessions WHERE token = ?').get(token);
  return row ? row.team_id : null;
}

/**
 * Simpan progress tim ke database.
 */
export function saveProgress(teamId, data) {
  db.prepare(`
    UPDATE teams SET
      locks         = ?,
      lock_order    = ?,
      panic_count   = ?,
      flappy_digits = ?,
      finished      = ?,
      duration      = ?
    WHERE id = ?
  `).run(
    JSON.stringify(data.locks),
    JSON.stringify(data.lockOrder),
    data.panicCount   ?? 0,
    data.flappyDigits ? JSON.stringify(data.flappyDigits) : null,
    data.finished     ? 1 : 0,
    data.duration     ?? 0,
    teamId,
  );
  return { success: true };
}

/**
 * Ambil progress tim berdasarkan teamId.
 */
export function getProgress(teamId) {
  const row = _byId(teamId);
  return row ? _row(row) : null;
}

/**
 * Leaderboard: tim yang sudah selesai, diurutkan dari durasi tercepat.
 */
export function getLeaderboard() {
  return db.prepare(`
    SELECT name, duration, panic_count
    FROM teams
    WHERE finished = 1
    ORDER BY duration ASC
    LIMIT 50
  `).all().map(r => ({
    name:       r.name,
    duration:   r.duration,
    panicCount: r.panic_count,
  }));
}
