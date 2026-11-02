/**
 * =============================================================
 *  MODULE: Panic
 *  Tanggung jawab: Sistem anti-curang Panic Hold.
 *  Local mode: hanya akun yang curang kena panic.
 * =============================================================
 */

import { State }        from './state.js';
import { saveProgress } from './api.js';
import { PANIC_ENABLED } from './config.js';

const PANIC_DELAY    = 2000; // ms sebelum panic triggered
const PANIC_DURATION = 15;   // detik countdown

let _panicTimeout   = null;
let _panicCountdown = null;
let _panicActive = false;
let _visibilityHandler = null;
let _blurHandler = null;
let _focusHandler = null;

function _isGameActive() {
  return !!State.teamData?.id && !State.teamData?.finished;
}

function _triggerPanic() {
  if (!_isGameActive() || !PANIC_ENABLED) return;
  if (_panicActive) return;

  _panicActive = true;
  State.teamData.panicCount = (State.teamData.panicCount || 0) + 1;
  saveProgress(State.teamData);

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
      _panicActive = false;
    }
  }, 1000);
}

export function closePanic() {
  document.getElementById('panic-modal').classList.remove('show');
  _panicActive = false;
  if (_panicCountdown) {
    clearInterval(_panicCountdown);
    _panicCountdown = null;
  }
}

export function startPanicPolling() {
  _attachEventListeners();
}

export function stopPanicPolling() {
  _removeEventListeners();
}

// ── Event listeners ───────────────────────────────────────────

function _attachEventListeners() {
  if (_visibilityHandler) return;

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
}
