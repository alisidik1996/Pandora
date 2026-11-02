/**
 * =============================================================
 *  MODULE: Box
 *  Tanggung jawab: Layar Kotak (grid 6 gembok), unlock logic,
 *  layar Final, dan tombol Tim Baru.
 * =============================================================
 */

import { LOCK_DEFS } from './config.js';
import { State } from './state.js';
import { saveProgress, clearToken } from './api.js';
import { showScreen, fmtDuration } from './utils.js';
import { stopMic } from './mic.js';
import { startPanicPolling, stopPanicPolling } from './panic.js';

let boxTimerInterval = null;

// ── Layar Kotak ──────────────────────────────────────────────

export function showBox() {
  renderBox();
  showScreen('screen-box');
}

export function renderBox() {
  const td = State.teamData;
  const opened = LOCK_DEFS.filter(l => td.locks[l.id]).length;

  document.getElementById('box-progress-fill').style.width = (opened / 6 * 100) + '%';
  document.getElementById('box-progress-text').textContent = `${opened} / 6 terbuka`;
  document.getElementById('box-team-info').innerHTML =
    `<strong>${td.name}</strong> &nbsp;|&nbsp; ⏱ <span id="box-timer-live">${fmtDuration(Date.now() - State.gameStartTime)}</span>`;

  const grid = document.getElementById('lock-grid');
  grid.innerHTML = '';
  LOCK_DEFS.forEach(l => {
    const unlocked = td.locks[l.id];
    const div = document.createElement('div');
    div.className = 'lock-card' + (unlocked ? ' unlocked' : '');
    div.innerHTML = `
      <div class="lock-icon"></div>
      <div class="lock-num">Lock #${l.num}</div>
      <div class="lock-name"></div>
      <span class="badge ${unlocked ? 'badge-unlocked' : 'badge-locked'}">${unlocked ? 'Terbuka' : 'Terkunci'}</span>`;
    div.addEventListener('click', () => openLockScreen(l));
    grid.appendChild(div);
  });

  _startBoxTimer();

  if (LOCK_DEFS.every(l => td.locks[l.id]) && !td.finished) finishGame();
}

function _startBoxTimer() {
  if (boxTimerInterval) clearInterval(boxTimerInterval);
  boxTimerInterval = setInterval(() => {
    const el = document.getElementById('box-timer-live');
    if (el) el.textContent = fmtDuration(Date.now() - State.gameStartTime);
  }, 1000);
}

// ── Navigasi gembok ───────────────────────────────────────────

export async function openLockScreen(lockDef) {
  if (boxTimerInterval) { clearInterval(boxTimerInterval); boxTimerInterval = null; }
  stopMic();

  // Clear msg hanya untuk lock yang belum terbuka
  ['l1-msg', 'l2-msg', 'l3-msg', 'l4-msg', 'l5-msg', 'l6-msg'].forEach(id => {
    const lockId = id.replace('-msg', '');
    if (!State.teamData.locks[lockId]) {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.textContent = ''; }
    }
  });

  const badge = document.getElementById(`${lockDef.id}-badge`);
  if (badge) {
    const open = State.teamData.locks[lockDef.id];
    badge.className = 'badge ' + (open ? 'badge-unlocked' : 'badge-locked');
    badge.textContent = open ? 'Terbuka' : 'Terkunci';
  }

  if (lockDef.id === 'l1') { const m = await import('./lock1.js'); m.initLock1(); }
  if (lockDef.id === 'l2') { const m = await import('./lock2.js'); m.initLock2(); }
  if (lockDef.id === 'l3') { const m = await import('./lock3.js'); m.initLock3Screen(); }
  if (lockDef.id === 'l4') { const m = await import('./lock4.js'); m.initLock4Screen(); }
  if (lockDef.id === 'l5') { const m = await import('./lock5.js'); m.initLock5(); }
  if (lockDef.id === 'l6') { const m = await import('./lock6.js'); m.initLock6Screen(); }

  showScreen(lockDef.screen);
}

// ── Re-init lock screen after refresh ────────────────────────

export function reInitLockScreen(screenId) {
  const lockDef = LOCK_DEFS.find(l => l.screen === screenId);
  if (!lockDef) return;

  if (lockDef.id === 'l1') { import('./lock1.js').then(m => m.initLock1()); }
  if (lockDef.id === 'l2') { import('./lock2.js').then(m => m.initLock2()); }
  if (lockDef.id === 'l3') { import('./lock3.js').then(m => m.initLock3Screen()); }
  if (lockDef.id === 'l4') { import('./lock4.js').then(m => m.initLock4Screen()); }
  if (lockDef.id === 'l5') { import('./lock5.js').then(m => m.initLock5()); }
  if (lockDef.id === 'l6') { import('./lock6.js').then(m => m.initLock6Screen()); }
}

export function backToBox() {
  if (boxTimerInterval) { clearInterval(boxTimerInterval); boxTimerInterval = null; }
  stopMic();
  showScreen('screen-box');
  renderBox();
}

// ── Unlock ────────────────────────────────────────────────────

export function unlockLock(id) {
  const td = State.teamData;
  if (td.locks[id]) return; // idempotent
  td.locks[id] = true;
  if (!td.lockOrder.includes(id)) td.lockOrder.push(id);

  // Auto-save ke server
  saveProgress(td);

  const badge = document.getElementById(`${id}-badge`);
  if (badge) { badge.className = 'badge badge-unlocked'; badge.textContent = 'Terbuka'; }

  // Cek semua lock terbuka (debounce untuk avoid double-trigger)
  setTimeout(() => {
    if (LOCK_DEFS.every(l => td.locks[l.id]) && !td.finished) {
      finishGame();
    }
  }, 100);
}

// ── Final ─────────────────────────────────────────────────────

export async function finishGame() {
  const td = State.teamData;
  if (td.finished) { renderFinal(); showScreen('screen-final'); return; }

  stopMic();
  stopPanicPolling(); // Stop polling saat game selesai
  td.finished = true;
  td.duration = Date.now() - td.startTime;
  await saveProgress(td);
  renderFinal();
  showScreen('screen-final');
}

export function renderFinal() {
  const td = State.teamData;
  const orderNames = td.lockOrder.map(id => {
    const def = LOCK_DEFS.find(l => l.id === id);
    return def ? `Lock #${def.num}` : id;
  }).join(' → ');

  document.getElementById('final-stats').innerHTML = `
    <h3 style="margin-bottom:12px;">Hasil Tim</h3>
    <div class="final-stat"><span class="final-label">Nama Tim</span><span class="final-value">${td.name}</span></div>
    <div class="final-stat"><span class="final-label">Durasi</span><span class="final-value">${fmtDuration(td.duration)}</span></div>
    <div class="final-stat"><span class="final-label">Panic Hold</span><span class="final-value">${td.panicCount}x</span></div>
    <div class="final-stat" style="border-bottom:none;"><span class="final-label">Urutan Buka</span><span class="final-value" style="font-size:0.85rem;">${orderNames || '-'}</span></div>
  `;
}

// ── Tim Baru ──────────────────────────────────────────────────

export function confirmNewTeam() {
  if (!confirm('Simpan Sekarang?.')) return;

  stopMic();
  import('./lock6.js').then(m => m.removeMotionListener()).catch(() => { });

  // Hapus token sesi — tim baru harus login ulang
  clearToken();
  State.teamData = {};
  State.gameStartTime = 0;

  document.getElementById('inp-login-name').value = '';
  document.getElementById('inp-login-password').value = '';
  document.getElementById('inp-register-name').value = '';
  document.getElementById('inp-register-password').value = '';
  ['login-msg', 'register-msg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });

  import('./team.js').then(m => {
    m.renderLeaderboard();
    showScreen('screen-team');
  });
}
