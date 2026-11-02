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
let _visibilityHandler = null;
let _blurHandler = null;
let _focusHandler = null;

function _isGameActive() {
  return !!State.teamData?.id && !State.teamData?.finished;
}

function _triggerPanic(fromGlobalDetection = false) {
  if (!_isGameActive() || !PANIC_ENABLED) return;
  if (_panicActive) return; // Skip jika panic sudah aktif

  console.log('[Panic] Trigger panic! From global:', fromGlobalDetection);

  _panicActive = true;

  // Hanya increment count jika dari lokal (bukan dari global detection)
  if (!fromGlobalDetection) {
    State.teamData.panicCount = (State.teamData.panicCount || 0) + 1;
    saveProgress(State.teamData); // fire-and-forget
    console.log('[Panic] Local cheat detected, incrementing count to:', State.teamData.panicCount);
  } else {
    console.log('[Panic] Global cheat detected, showing modal without incrementing');
  }

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
    _triggerPanic(true); // Pass true = from global detection
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

  // Attach event listeners
  _attachEventListeners();
}

export function stopPanicPolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }

  // Remove event listeners
  _removeEventListeners();
}

// ── Event listeners ───────────────────────────────────────────

function _attachEventListeners() {
  if (_visibilityHandler) return; // Already attached

  _visibilityHandler = () => {
    if (!_isGameActive() || !PANIC_ENABLED) return;
    if (document.hidden) {
      _panicTimeout = setTimeout(_triggerPanic, PANIC_DELAY);
    } else {
      if (_panicTimeout) { clearTimeout(_panicTimeout); _panicTimeout = null; }
    }
  };

  _blurHandler = () => {
    if (!_isGameActive() || !PANIC_ENABLED) return;
    if (!_panicTimeout) _panicTimeout = setTimeout(_triggerPanic, PANIC_DELAY);
  };

  _focusHandler = () => {
    if (_panicTimeout) { clearTimeout(_panicTimeout); _panicTimeout = null; }
  };

  document.addEventListener('visibilitychange', _visibilityHandler);
  window.addEventListener('blur', _blurHandler);
  window.addEventListener('focus', _focusHandler);

  console.log('[Panic] Event listeners attached');
}

function _removeEventListeners() {
  if (_visibilityHandler) {
    document.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }
  if (_blurHandler) {
    window.removeEventListener('blur', _blurHandler);
    _blurHandler = null;
  }
  if (_focusHandler) {
    window.removeEventListener('focus', _focusHandler);
    _focusHandler = null;
  }

  console.log('[Panic] Event listeners removed');
}
