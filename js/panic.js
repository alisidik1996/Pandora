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
let _panicActive = false; // Flag untuk cegah overlap

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
  console.log('[Panic] Global count:', count, '| Last:', _lastGlobalPanicCount, '| Active:', _panicActive);

  // Jika global count naik DAN panic tidak sedang aktif
  if (count > _lastGlobalPanicCount && !_panicActive) {
    console.log('[Panic] Global panic detected! Triggering...');
    _lastGlobalPanicCount = count;
    _triggerPanic();
  } else if (count > _lastGlobalPanicCount && _panicActive) {
    // Update count tapi skip trigger karena panic masih jalan
    console.log('[Panic] Count increased but panic already active, updating last count');
    _lastGlobalPanicCount = count;
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
