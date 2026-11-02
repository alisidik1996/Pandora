/**
 * =============================================================
 *  MODULE: Lock4 — Sunyi, Tahan 10 Detik
 *  Tanggung jawab: Mengukur suara dasar, lalu memantau keheningan
 *  selama 10 detik berturut-turut. Tidak ada input PIN — gembok
 *  terbuka otomatis saat timer mencapai 10.0 detik.
 * =============================================================
 */

import { State }                       from './state.js';
import { showMsg, showScreen }         from './utils.js';
import { initMic, stopMic, getMicRMS } from './mic.js';
import { unlockLock, renderBox }       from './box.js';
import { SILENCE_THRESHOLD_OFFSET }    from './config.js';

// ── State privat ──────────────────────────────────────────────
let l4Baseline      = 0;
let l4Threshold     = 0;
let l4SilenceTimer  = 0;
let l4SilenceRunning = false;
let l4SilenceInterval = null;
let l4VolInterval     = null;

// ── Init ──────────────────────────────────────────────────────

export function initLock4Screen() {
  l4Baseline       = 0;
  l4Threshold      = 0;
  l4SilenceTimer   = 0;
  l4SilenceRunning = false;
  if (l4SilenceInterval) clearInterval(l4SilenceInterval);
  if (l4VolInterval)     clearInterval(l4VolInterval);

  document.getElementById('l4-timer').textContent          = '0.0';
  document.getElementById('btn-l4-silence').disabled       = true;
  document.getElementById('l4-vol-line').style.display     = 'none';
  document.getElementById('l4-baseline-status').textContent = '';
  document.getElementById('l4-threshold-txt').textContent   = '';
  const m = document.getElementById('l4-msg');
  if (m) { m.style.display = 'none'; m.textContent = ''; }

  if (State.teamData.locks.l4) {
    document.getElementById('btn-l4-baseline').disabled = true;
    document.getElementById('btn-l4-silence').disabled = true;

    const msgDiv = document.getElementById('l4-msg');
    if (msgDiv) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'msg msg-ok';
      msgDiv.textContent = 'Lock sudah terbuka!';
    }
  }
}

// ── Ukur suara dasar ──────────────────────────────────────────

export async function startBaseline() {
  document.getElementById('btn-l4-baseline').disabled       = true;
  document.getElementById('l4-baseline-status').textContent = 'Meminta izin mikrofon...';

  const ok = await initMic();
  if (!ok) {
    document.getElementById('l4-baseline-status').textContent = '⚠ Mikrofon tidak tersedia.';
    document.getElementById('btn-l4-baseline').disabled       = false;
    return;
  }

  document.getElementById('l4-baseline-status').textContent = 'Mengukur suara dasar (2 detik)... diam dulu.';

  const samples = [];
  const start   = Date.now();
  const cal     = setInterval(() => {
    samples.push(getMicRMS());
    if (Date.now() - start >= 2000) {
      clearInterval(cal);
      l4Baseline  = samples.reduce((a, b) => a + b, 0) / samples.length;
      l4Threshold = l4Baseline + SILENCE_THRESHOLD_OFFSET;

      document.getElementById('l4-baseline-status').textContent = `Suara dasar: ${l4Baseline.toFixed(3)}, batas: ${l4Threshold.toFixed(3)}`;
      document.getElementById('l4-threshold-txt').textContent   = 'Garis putih = batas kebisingan';
      document.getElementById('l4-vol-line').style.display      = 'block';
      document.getElementById('l4-vol-line').style.left         = Math.min(l4Threshold * 400, 100) + '%';
      document.getElementById('btn-l4-baseline').disabled       = false;
      document.getElementById('btn-l4-silence').disabled        = false;

      _startVolMeter();
    }
  }, 100);
}

function _startVolMeter() {
  if (l4VolInterval) clearInterval(l4VolInterval);
  l4VolInterval = setInterval(() => {
    document.getElementById('l4-vol-fill').style.width = Math.min(getMicRMS() * 400, 100) + '%';
    document.getElementById('l4-vol-line').style.left  = Math.min(l4Threshold * 400, 100) + '%';
  }, 50);
}

// ── Tahan sunyi ───────────────────────────────────────────────

export function startSilence() {
  if (l4SilenceRunning) return;
  l4SilenceRunning = true;
  l4SilenceTimer   = 0;
  document.getElementById('btn-l4-silence').disabled    = true;
  document.getElementById('l4-timer').textContent       = '0.0';

  l4SilenceInterval = setInterval(() => {
    const rms = getMicRMS();
    if (rms < l4Threshold) {
      l4SilenceTimer += 0.2;
      document.getElementById('l4-timer').textContent = l4SilenceTimer.toFixed(1);

      if (l4SilenceTimer >= 10.0) {
        clearInterval(l4SilenceInterval);
        clearInterval(l4VolInterval);
        l4SilenceRunning = false;
        stopMic();
        showMsg('l4-msg', 'Gembok terbuka! Tim berhasil tahan sunyi 10 detik.', 'ok');
        unlockLock('l4');
      }
    } else {
      l4SilenceTimer = 0;
      document.getElementById('l4-timer').textContent = '0.0';
    }
  }, 200);
}

// ── Navigasi kembali ──────────────────────────────────────────

export function backToBox4() {
  l4SilenceRunning = false;
  if (l4SilenceInterval) clearInterval(l4SilenceInterval);
  if (l4VolInterval)     clearInterval(l4VolInterval);
  stopMic();
  import('./box.js').then(m => { m.renderBox(); m.backToBox(); });
}
