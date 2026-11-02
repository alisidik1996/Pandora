/**
 * =============================================================
 *  MODULE: Lock1
 *  Tanggung jawab: Gembok 1 — QR di Rak Gelap (CAM 3).
 * =============================================================
 */

import { PIN_L1 }              from './config.js';
import { State }               from './state.js';
import { showMsg }             from './utils.js';
import { unlockLock }          from './box.js';
import { getPinValue, initPinInputs } from './pin-input.js';

export function initLock1() {
  initPinInputs('#l1-pin-group');

  if (State.teamData.locks.l1) {
    // Disable input + button
    document.querySelectorAll('#l1-pin-group .pin-digit').forEach(el => el.disabled = true);
    const btn = document.getElementById('btn-l1-check');
    if (btn) btn.disabled = true;

    // Show pesan
    const msgDiv = document.getElementById('l1-msg');
    if (msgDiv) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'msg msg-ok';
      msgDiv.textContent = 'Lock sudah terbuka!';
    }
  }
}

export function checkLock1() {
  const val = getPinValue('#l1-pin-group');
  if (!val || val.length !== 5) {
    showMsg('l1-msg', 'Masukkan 5 digit PIN.', 'err');
    return;
  }

  if (val === PIN_L1) {
    showMsg('l1-msg', 'Lock terbuka!', 'ok');
    unlockLock('l1');
  } else {
    showMsg('l1-msg', 'PIN salah.', 'err');
  }
}
