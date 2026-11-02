/**
 * =============================================================
 *  MODULE: Panic
 *  Tanggung jawab: Sistem anti-curang Panic Hold.
 *  Global mode: jika 1 tim curang, semua tim kena panic.
 * =============================================================
 */

import { State }        from './state.js';
import { saveProgress, fetchGlobalPanicCount } from './api.js';
import { PANIC_ENABLED } from './config.js';

const PANIC_DELAY    = 2000; // ms sebelum panic triggered
const PANIC_DURATION = 15;   // detik countdown
const POLL_INTERVAL  = 3000; // polling global panic count setiap 3 detik

let _panicTimeout   = null;
let _panicCountdown = null;
let _lastGlobalPanicCount = 0;
let _pollInterval = null;

function _isGameActive() {
  return !!State.teamData?.id && !State.teamData?.finished;
}

function _triggerPanic() {
  if (!_isGameActive() || !PANIC_ENABLED) return;

  State.teamData.panicCount = (State.teamData.panicCount || 0) + 1;

  // Update last global count agar tidak re-trigger dari polling sendiri
  _lastGlobalPanicCount++;

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
    }
  }, 1000);
}

export function closePanic() {
  document.getElementById('panic-modal').classList.remove('show');
}

// ── Global panic polling ──────────────────────────────────────
async function _checkGlobalPanic() {
  if (!_isGameActive() || !PANIC_ENABLED) return;

  const count = await fetchGlobalPanicCount();
  console.log('[Panic] Global count:', count, '| Last:', _lastGlobalPanicCount);

  // Jika global count naik, trigger panic di tim ini
  if (count > _lastGlobalPanicCount) {
    console.log('[Panic] Global panic detected! Triggering...');
    _lastGlobalPanicCount = count;
    _triggerPanic();
  }
}

// Start polling saat game aktif
export function startPanicPolling() {
  if (_pollInterval) return;

  console.log('[Panic] Starting global panic polling...');

  // Init last count
  fetchGlobalPanicCount().then(count => {
    _lastGlobalPanicCount = count;
    console.log('[Panic] Initial global count:', count);
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
