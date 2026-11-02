/**
 * =============================================================
 *  MODULE: Lock2
 *  Tanggung jawab: Gembok 2 — Hitung Estafet 6 Langkah.
 * =============================================================
 */

import { PIN_L2 }              from './config.js';
import { State }               from './state.js';
import { showMsg }             from './utils.js';
import { unlockLock }          from './box.js';
import { getPinValue, initPinInputs } from './pin-input.js';

export function initLock2() {
  initPinInputs('#l2-pin-group');

  if (State.teamData.locks.l2) {
    document.querySelectorAll('#l2-pin-group .pin-digit').forEach(el => el.disabled = true);
    const btn = document.getElementById('btn-l2-check');
    if (btn) btn.disabled = true;

    const msgDiv = document.getElementById('l2-msg');
    if (msgDiv) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'msg msg-ok';
      msgDiv.textContent = 'Lock sudah terbuka!';
    }
  }
}

export function checkLock2() {
  const val = getPinValue('#l2-pin-group');
  if (!val || val.length !== 6) {
    showMsg('l2-msg', 'Masukkan 6 digit kode.', 'err');
    return;
  }

  if (val === PIN_L2) {
    showMsg('l2-msg', 'Lock terbuka!', 'ok');
    unlockLock('l2');
  } else {
    showMsg('l2-msg', 'Kode salah.', 'err');
  }
}
