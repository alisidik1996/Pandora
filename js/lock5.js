/**
 * =============================================================
 *  MODULE: Lock5 — Perceptron
 *  Tanggung jawab: Validasi tabel perceptron dari rumus, bukan
 *  dari hardcode jawaban. Mendukung desimal dengan koma atau titik.
 * =============================================================
 */

import { State }      from './state.js';
import { showMsg }    from './utils.js';
import { unlockLock } from './box.js';

// ── Rumus perceptron ──────────────────────────────────────────
// w1=1, w2=1, b=-1.5
function _s(x1, x2)  { return x1 * 1 + x2 * 1 + (-1.5); }
function _h(s)        { return s >= 0 ? 1 : 0; }
function _dec(str)    { return parseFloat(String(str).replace(',', '.').trim()); }

// ── Init ──────────────────────────────────────────────────────

export function initLock5() {
  if (State.teamData.locks.l5) {
    // Disable semua input
    ['p00s', 'p00h', 'p01h', 'p10s'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });

    const btn = document.getElementById('btn-l5-check');
    if (btn) btn.disabled = true;

    const msgDiv = document.getElementById('l5-msg');
    if (msgDiv) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'msg msg-ok';
      msgDiv.textContent = 'Lock sudah terbuka!';
    }
  }
}

// ── Validasi ──────────────────────────────────────────────────

export function checkLock5() {
  const p00s = _dec(document.getElementById('p00s').value);
  const p00h = parseInt(document.getElementById('p00h').value.trim(), 10);
  const p01h = parseInt(document.getElementById('p01h').value.trim(), 10);
  const p10s = _dec(document.getElementById('p10s').value);

  const c00s = _s(0, 0);  // -1.5
  const c00h = _h(c00s);  // 0
  const c01h = _h(_s(0, 1)); // 0
  const c10s = _s(1, 0);  // -0.5

  const ok = Math.abs(p00s - c00s) < 0.01
          && p00h === c00h
          && p01h === c01h
          && Math.abs(p10s - c10s) < 0.01;

  if (ok) {
    showMsg('l5-msg', 'Gembok terbuka!', 'ok');
    unlockLock('l5');
  } else {
    showMsg('l5-msg', 'Ada yang belum tepat, cek lagi semua baris.', 'err');
  }
}
