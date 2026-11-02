/**
 * =============================================================
 *  MODULE: Panic
 *  Tanggung jawab: Sistem anti-curang Panic Hold.
 * =============================================================
 */

import { State }        from './state.js';
import { saveProgress } from './api.js';
import { PANIC_ENABLED } from './config.js';

const PANIC_DELAY    = 2000; // ms sebelum panic triggered
const PANIC_DURATION = 15;   // detik countdown

let _panicTimeout   = null;
let _panicCountdown = null;

function _isGameActive() {
  return !!State.teamData?.id && !State.teamData?.finished;
}

function _triggerPanic() {
  if (!_isGameActive() || !PANIC_ENABLED) return;

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
    }
  }, 1000);
}

export function closePanic() {
  document.getElementById('panic-modal').classList.remove('show');
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
