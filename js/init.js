/**
 * =============================================================
 *  MODULE: Init — Entry Point
 *  Tanggung jawab: Bind semua event listener, inisialisasi app.
 *
 *  CARA MENJALANKAN:
 *    npm start   →   http://localhost:6161/
 * =============================================================
 */

import { showScreen }                             from './utils.js';
import { getToken, clearToken }                  from './api.js';
import { renderLeaderboard, handleLogin, handleRegister,
         restoreSession, showLoginForm, showRegisterForm, renderMenu } from './team.js';
import { backToBox, confirmNewTeam }             from './box.js';
import { checkLock1 }                            from './lock1.js';
import { checkLock2 }                            from './lock2.js';
import { startFlappyCalibrate, startFlappyGame,
         resetFlappy, checkLock3, backToBox3 }   from './lock3.js';
import { startBaseline, startSilence, backToBox4 } from './lock4.js';
import { checkLock5 }                            from './lock5.js';
import { startSeekerStill, activateLock6Manual,
         checkLock6, backToBox6 }                from './lock6.js';
import { closePanic }                            from './panic.js';

function bindEvents() {
  // Intro (login/register langsung di intro)
  document.getElementById('btn-toggle-login')
    .addEventListener('click', showLoginForm);
  document.getElementById('btn-toggle-register')
    .addEventListener('click', showRegisterForm);

  document.getElementById('btn-team-login')
    .addEventListener('click', handleLogin);
  document.getElementById('btn-team-register')
    .addEventListener('click', handleRegister);

  // Enter di input login → submit
  ['inp-login-name', 'inp-login-password'].forEach(id => {
    document.getElementById(id)
      .addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });

  // Enter di input register → submit
  ['inp-register-name', 'inp-register-password'].forEach(id => {
    document.getElementById(id)
      .addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
  });

  // Menu Pandora
  document.getElementById('card-pandora')
    .addEventListener('click', () => {
      import('./box.js').then(m => m.showBox());
    });
  document.getElementById('btn-menu-logout')
    .addEventListener('click', () => {
      if (!confirm('Yakin mau logout?')) return;
      clearToken();
      showScreen('screen-intro');
    });

  // Box back button
  document.getElementById('btn-box-back')
    .addEventListener('click', () => showScreen('screen-menu'));

  // Lock 1
  document.getElementById('btn-l1-back')
    .addEventListener('click', backToBox);
  document.getElementById('btn-l1-check')
    .addEventListener('click', checkLock1);

  // Lock 2
  document.getElementById('btn-l2-back')
    .addEventListener('click', backToBox);
  document.getElementById('btn-l2-check')
    .addEventListener('click', checkLock2);

  // Lock 3 — Flappy
  document.getElementById('btn-l3-back')
    .addEventListener('click', backToBox3);
  document.getElementById('btn-l3-calibrate')
    .addEventListener('click', startFlappyCalibrate);
  document.getElementById('btn-l3-start')
    .addEventListener('click', startFlappyGame);
  document.getElementById('btn-l3-reset')
    .addEventListener('click', resetFlappy);
  document.getElementById('btn-l3-check')
    .addEventListener('click', checkLock3);

  // Lock 4 — Sunyi
  document.getElementById('btn-l4-back')
    .addEventListener('click', backToBox4);
  document.getElementById('btn-l4-baseline')
    .addEventListener('click', startBaseline);
  document.getElementById('btn-l4-silence')
    .addEventListener('click', startSilence);

  // Lock 5 — Perceptron
  document.getElementById('btn-l5-back')
    .addEventListener('click', backToBox);
  document.getElementById('btn-l5-check')
    .addEventListener('click', checkLock5);

  // Lock 6 — Seeker
  document.getElementById('btn-l6-back')
    .addEventListener('click', backToBox6);
  document.getElementById('btn-l6-start-still')
    .addEventListener('click', startSeekerStill);
  document.getElementById('btn-l6-manual')
    .addEventListener('click', activateLock6Manual);
  document.getElementById('btn-l6-check')
    .addEventListener('click', checkLock6);

  // Final
  document.getElementById('btn-new-team')
    .addEventListener('click', confirmNewTeam);

  // Panic modal
  document.getElementById('panic-close-btn')
    .addEventListener('click', closePanic);
}

window.addEventListener('load', () => {
  bindEvents();
  renderLeaderboard();

  // Restore sesi jika token ada
  const token = getToken();
  if (token) {
    restoreSession();
  } else {
    showScreen('screen-intro');
  }
});
