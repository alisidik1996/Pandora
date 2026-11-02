/**
 * =============================================================
 *  MODULE: Lock6 — QR Mobil Box + Seeker Diam
 *  Tanggung jawab: Deteksi gerakan via DeviceMotionEvent,
 *  kalibrasi diam 3 detik, fallback mode manual (fasilitator).
 *
 *  SETEL AMBANG INI SAAT TES HP BESOK — edit di js/config.js:
 *    MOTION_THRESHOLD   (default 2.5 m/s²)
 *    MOTION_COUNT_LIMIT (default 3 deteksi/detik)
 * =============================================================
 */

import { MOTION_THRESHOLD, MOTION_COUNT_LIMIT, PIN_L6 } from './config.js';
import { State }                      from './state.js';
import { showMsg, showScreen }        from './utils.js';
import { unlockLock, renderBox }     from './box.js';
import { getPinValue, initPinInputs } from './pin-input.js';

// ── State privat ──────────────────────────────────────────────
let _motionListener      = null;
let _calibInterval       = null;
let _motionActive        = false;
let _prevAccel           = null;
let _motionCountInWindow = 0;
let _motionWindowStart   = 0;
let _fallbackMode        = false;

// ── Init ──────────────────────────────────────────────────────

export function initLock6Screen() {
  _motionActive        = false;
  _fallbackMode        = false;
  _prevAccel           = null;
  _motionCountInWindow = 0;

  document.getElementById('l6-countdown-area').style.display = 'none';
  document.getElementById('l6-fallback-area').style.display  = 'none';
  document.getElementById('l6-motion-status').textContent    = '';
  document.getElementById('btn-l6-start-still').disabled     = false;

  removeMotionListener();
  initPinInputs('#l6-pin-group');

  if (State.teamData.locks.l6) {
    // Tampilkan PIN area supaya msg terlihat
    document.getElementById('l6-pin-area').style.display = 'block';

    document.getElementById('btn-l6-start-still').disabled = true;
    document.getElementById('btn-l6-check').disabled = true;
    document.querySelectorAll('#l6-pin-group .pin-digit').forEach(el => el.disabled = true);

    const btnManual = document.getElementById('btn-l6-manual');
    if (btnManual) btnManual.disabled = true;

    const msgDiv = document.getElementById('l6-msg');
    if (msgDiv) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'msg msg-ok';
      msgDiv.textContent = 'Lock sudah terbuka!';
    }
  } else {
    document.getElementById('l6-pin-area').style.display = 'none';
    const m = document.getElementById('l6-msg');
    if (m) { m.style.display = 'none'; m.textContent = ''; }
  }
}

// ── Motion listener ───────────────────────────────────────────

export function removeMotionListener() {
  if (_motionListener) {
    window.removeEventListener('devicemotion', _motionListener);
    _motionListener = null;
  }
}

// ── Mulai diam ────────────────────────────────────────────────

export async function startSeekerStill() {
  document.getElementById('btn-l6-start-still').disabled  = true;
  document.getElementById('l6-motion-status').textContent = 'Meminta izin sensor...';

  // iOS memerlukan requestPermission dari klik user
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceMotionEvent.requestPermission();
      if (perm !== 'granted') {
        document.getElementById('l6-fallback-area').style.display  = 'block';
        document.getElementById('l6-motion-status').textContent    = 'Izin sensor ditolak.';
        document.getElementById('btn-l6-start-still').disabled     = false;
        return;
      }
    } catch {
      document.getElementById('l6-fallback-area').style.display = 'block';
      document.getElementById('l6-motion-status').textContent   = 'Sensor tidak bisa diakses.';
      document.getElementById('btn-l6-start-still').disabled    = false;
      return;
    }
  }

  // Kalibrasi 3 detik
  let count = 3;
  document.getElementById('l6-countdown-area').style.display = 'block';
  document.getElementById('l6-countdown').textContent        = count;
  document.getElementById('l6-motion-status').textContent    = 'Kalibrasi: tetap diam...';

  _calibInterval = setInterval(() => {
    count--;
    document.getElementById('l6-countdown').textContent = count;
    if (count <= 0) {
      clearInterval(_calibInterval);
      document.getElementById('l6-countdown-area').style.display = 'none';
      _startMotionDetection();
    }
  }, 1000);
}

function _startMotionDetection() {
  _motionActive        = true;
  _prevAccel           = null;
  _motionCountInWindow = 0;
  _motionWindowStart   = Date.now();
  let gotData          = false;

  document.getElementById('l6-motion-status').textContent = '📡 Sensor aktif. Tetap diam, input PIN boleh diketik.';
  document.getElementById('l6-pin-area').style.display    = 'block';

  _motionListener = e => {
    if (!_motionActive) return;
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc || (acc.x == null && acc.y == null && acc.z == null)) return;
    gotData = true;

    const ax = acc.x || 0, ay = acc.y || 0, az = acc.z || 0;
    if (_prevAccel) {
      const dx    = ax - _prevAccel.x;
      const dy    = ay - _prevAccel.y;
      const dz    = az - _prevAccel.z;
      const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const now = Date.now();
      if (now - _motionWindowStart > 1000) {
        _motionCountInWindow = 0;
        _motionWindowStart   = now;
      }

      if (delta > MOTION_THRESHOLD) {
        _motionCountInWindow++;
        if (_motionCountInWindow >= MOTION_COUNT_LIMIT) {
          _triggerSeekerMoved();
        }
      }
    }
    _prevAccel = { x: ax, y: ay, z: az };
  };

  window.addEventListener('devicemotion', _motionListener);

  // Fallback: jika 3.5 detik tidak ada data sensor sama sekali
  setTimeout(() => {
    if (!gotData && _motionActive) {
      _motionActive = false;
      removeMotionListener();
      document.getElementById('l6-fallback-area').style.display = 'block';
      document.getElementById('l6-pin-area').style.display      = 'none';
      document.getElementById('l6-motion-status').textContent   = 'Sensor gerak tidak tersedia.';
      document.getElementById('btn-l6-start-still').disabled    = false;
    }
  }, 3500);
}

// ── Seeker bergerak → kembali ke kotak ───────────────────────

function _triggerSeekerMoved() {
  _motionActive = false;
  removeMotionListener();

  const m = document.getElementById('l6-msg');
  if (m) { m.style.display = 'none'; m.textContent = ''; }

  renderBox();
  showScreen('screen-box');

  // Toast peringatan
  setTimeout(() => {
    const toast = document.createElement('div');
    toast.className = 'msg msg-err';
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);width:90%;max-width:400px;z-index:9998;text-align:center;';
    toast.textContent = 'Kamu tidak seharusnya bergerak – Gembok 6 tertutup, buka lagi setelah diam.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }, 300);
}

// ── Mode manual (tanpa sensor) ────────────────────────────────

export function activateLock6Manual() {
  _fallbackMode = true;
  document.getElementById('l6-fallback-area').style.display = 'none';
  document.getElementById('l6-pin-area').style.display      = 'block';
  document.getElementById('l6-motion-status').textContent   = '👁 Mode manual aktif. Fasilitator pantau via CAM 2.';
}

// ── Validasi PIN ──────────────────────────────────────────────

export function checkLock6() {
  const val = getPinValue('#l6-pin-group');
  if (!val || val.length !== 3) {
    showMsg('l6-msg', 'Masukkan 3 digit PIN.', 'err');
    return;
  }

  if (val === PIN_L6) {
    _motionActive = false;
    removeMotionListener();
    showMsg('l6-msg', 'Lock terbuka!', 'ok');
    unlockLock('l6');
  } else {
    showMsg('l6-msg', 'PIN salah.', 'err');
  }
}

// ── Navigasi kembali ──────────────────────────────────────────

export function backToBox6() {
  _motionActive = false;
  removeMotionListener();
  if (_calibInterval) clearInterval(_calibInterval);
  import('./box.js').then(m => { m.renderBox(); m.backToBox(); });
}
