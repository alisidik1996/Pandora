/**
 * =============================================================
 *  MODULE: Storage
 *  Tanggung jawab: Semua operasi localStorage untuk data tim.
 * =============================================================
 */

import { LS_KEY } from './config.js';

function loadStorage() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function saveStorage(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/** Buat kunci unik berdasarkan nama tim + PIN tim. */
export function getTeamKey(name, pin) {
  return 'team__' + name.trim().toLowerCase() + '__' + String(pin).trim();
}

/** Muat data tim dari storage, atau null kalau belum ada. */
export function loadTeam(key) {
  return loadStorage()[key] || null;
}

/** Simpan data tim ke storage. */
export function saveTeam(key, data) {
  const store = loadStorage();
  store[key] = data;
  saveStorage(store);
}

/** Ambil daftar tim yang sudah selesai, diurutkan dari durasi tercepat. */
export function getLeaderboard() {
  const store = loadStorage();
  const lb = [];
  for (const k of Object.keys(store)) {
    if (k.startsWith('team__')) {
      const t = store[k];
      if (t.finished) lb.push({ name: t.name, duration: t.duration, panicCount: t.panicCount });
    }
  }
  lb.sort((a, b) => a.duration - b.duration);
  return lb;
}
