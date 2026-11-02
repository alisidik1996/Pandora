/**
 * =============================================================
 *  MODULE: Panic
 *  Tanggung jawab: Sistem anti-curang Panic Hold.
 *  Global mode: jika 1 tim curang, semua tim kena panic.
 *
 *  Approach: Local trigger + increment personal count only.
 *  Polling detects OTHER teams' panic via global count change.
 * =============================================================
 */

import { State }        from './state.js';
import { saveProgress, fetchGlobalPanicCount } from './api.js';
import { PANIC_ENABLED } from './config.js';

const PANIC_DELAY    = 2000; // ms sebelum panic triggered
const PANIC_DURATION = 15;   // detik countdown
const POLL_INTERVAL  = 5000; // polling global panic count setiap 5 detik

let _panicTimeout   = null;
let _panicCountdown = null;
let _lastGlobalPanicCount = 0;
let _pollInterval = null;
let _panicActive = false; // Flag untuk cegah overlap
let _sessionStartCount = 0; // Count saat session dimulai

function _isGameActive() {
  return !!State.teamData?.id && !State.teamData?.finished;
}

function _triggerPanic() {
  if (!_isGameActive() || !PANIC_ENABLED) return;
  if (_panicActive) return; // Skip jika panic sudah aktif

  _panicActive = true;
  State.teamData.panicCount = (State.teamData.panicCount || 0) + 1;
  saveProgress(State.teamData); // fire-and-forget

  const modal    = document.getElementById('panic-modal');
  const closeBtn = document.getElementById('panic-close-btn');
  const txt      = document.getElementById('panic-countdown-txt');

  modal.classList.add('show');
  closeBtn.disabled = true;
  let sec = PANIC_DURATION;
  txt.textContent = `Tombol aktif dalam ${sec} detik...`;

  if (_panicCountdown) clearInterval(_panicCountdown);
  _panicCountdown = setInterval(() => {
    sec--;
    txt.textContent = sec > 0 ? `Tombol aktif dalam ${sec} detik...` : '';
    if (sec <= 0) {
      clearInterval(_panicCountdown);
      _panicCountdown = null;
      closeBtn.disabled = false;
      _panicActive = false; // Reset flag saat selesai
    }
  }, 1000);
}

export function closePanic() {
  document.getElementById('panic-modal').classList.remove('show');
  _panicActive = false; // Reset flag saat manual close
  if (_panicCountdown) {
    clearInterval(_panicCountdown);
    _panicCountdown = null;
  }
}

// ── Global panic polling ──────────────────────────────────────
async function _checkGlobalPanic() {
  if (!_isGameActive() || !PANIC_ENABLED) return;

  const count = await fetchGlobalPanicCount();

  // Detect perubahan relatif terhadap session start
  const delta = count - _sessionStartCount;
  const expectedDelta = (State.teamData.panicCount || 0);

  console.log('[Panic] Global:', count, '| Session start:', _sessionStartCount, '| Delta:', delta, '| Expected:', expectedDelta);

  // Jika delta > expected = ada tim lain yang panic
  if (delta > expectedDelta && !_panicActive) {
    console.log('[Panic] Other team panic detected! Triggering...');
    _sessionStartCount = count - (State.teamData.panicCount || 0); // Adjust baseline
    _triggerPanic();
  }
}

// Start polling saat game aktif
export function startPanicPolling() {
  if (_pollInterval) return;

  console.log('[Panic] Starting global panic polling...');

  // Init session baseline
  fetchGlobalPanicCount().then(count => {
    _sessionStartCount = count - (State.teamData.panicCount || 0);
    console.log('[Panic] Session baseline:', _sessionStartCount, '| Team count:', State.teamData.panicCount);
  });

  _pollInterval = setInterval(_checkGlobalPanic, POLL_INTERVAL);
}

export function stopPanicPolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}

// ── Event listeners ───────────────────────────────────────────

document.addEventListener('visibilitychange', () => {
  if (!_isGameActive() || !PANIC_ENABLED) return;
  if (document.hidden) {
    _panicTimeout = setTimeout(_triggerPanic, PANIC_DELAY);
  } else {
    if (_panicTimeout) { clearTimeout(_panicTimeout); _panicTimeout = null; }
  }
});

window.addEventListener('blur', () => {
  if (!_isGameActive() || !PANIC_ENABLED) return;
  if (!_panicTimeout) _panicTimeout = setTimeout(_triggerPanic, PANIC_DELAY);
});

window.addEventListener('focus', () => {
  if (_panicTimeout) { clearTimeout(_panicTimeout); _panicTimeout = null; }
});
