/**
 * =============================================================
 *  MODULE: Team
 *  Tanggung jawab: Login/daftar tim via API, render leaderboard.
 * =============================================================
 */

import { State }                   from './state.js';
import { login, register, fetchLeaderboard, getToken, clearToken } from './api.js';
import { showScreen, showMsg, fmtDuration } from './utils.js';

// ── Restore sesi dari localStorage ───────────────────────────

export async function restoreSession() {
  const token = getToken();
  if (!token) { showScreen('screen-intro'); return; }

  try {
    const res = await fetch('/api/progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      clearToken();
      localStorage.removeItem('pb_last_screen');
      showScreen('screen-intro');
      return;
    }

    const data = await res.json();
    State.teamData      = data.team;
    State.gameStartTime = data.team.startTime;

    if (data.team.finished) {
      import('./box.js').then(m => { m.renderFinal(); showScreen('screen-final'); });
    } else {
      // Restore last screen atau default ke menu
      const lastScreen = localStorage.getItem('pb_last_screen');
      if (lastScreen && lastScreen !== 'screen-intro') {
        if (lastScreen === 'screen-menu') {
          showScreen('screen-menu');
          renderMenu();
        } else if (lastScreen === 'screen-box') {
          showScreen('screen-box');
          import('./box.js').then(m => m.renderBox());
        } else if (lastScreen.startsWith('screen-lock')) {
          showScreen(lastScreen);
          import('./box.js').then(m => m.reInitLockScreen(lastScreen));
        } else {
          showScreen('screen-menu');
          renderMenu();
        }
      } else {
        showScreen('screen-menu');
        renderMenu();
      }
    }
  } catch (e) {
    console.warn('Restore session gagal:', e.message);
    clearToken();
    localStorage.removeItem('pb_last_screen');
    showScreen('screen-intro');
  }
}

// ── Leaderboard ───────────────────────────────────────────────

export async function renderLeaderboard() {
  const el = document.getElementById('leaderboard-list');
  el.innerHTML = '<p class="text-sm text-dim">Memuat...</p>';

  const lb = await fetchLeaderboard();

  if (!lb.length) {
    el.innerHTML = '<p class="text-sm text-dim">Belum ada tim yang selesai.</p>';
    return;
  }
  el.innerHTML = lb.map((t, i) => `
    <div class="lb-row">
      <span class="lb-name">${i + 1}. ${t.name}</span>
      <span class="lb-meta">
        <span>⏱ ${fmtDuration(t.duration)}</span>
        <span>Panic: ${t.panicCount}x</span>
      </span>
    </div>`).join('');
}

// ── Toggle form ───────────────────────────────────────────────

export function showLoginForm() {
  document.getElementById('form-login').style.display = 'block';
  document.getElementById('form-register').style.display = 'none';
  document.getElementById('btn-toggle-login').classList.add('btn-primary');
  document.getElementById('btn-toggle-login').classList.remove('btn-secondary');
  document.getElementById('btn-toggle-register').classList.add('btn-secondary');
  document.getElementById('btn-toggle-register').classList.remove('btn-primary');
}

export function showRegisterForm() {
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('form-register').style.display = 'block';
  document.getElementById('btn-toggle-register').classList.add('btn-primary');
  document.getElementById('btn-toggle-register').classList.remove('btn-secondary');
  document.getElementById('btn-toggle-login').classList.add('btn-secondary');
  document.getElementById('btn-toggle-login').classList.remove('btn-primary');
}

// ── Login ─────────────────────────────────────────────────────

export async function handleLogin() {
  const name     = document.getElementById('inp-login-name').value.trim();
  const password = document.getElementById('inp-login-password').value;
  const btn      = document.getElementById('btn-team-login');

  if (!name)     { showMsg('login-msg', 'Nama tim tidak boleh kosong.', 'err'); return; }
  if (!password) { showMsg('login-msg', 'Password tidak boleh kosong.', 'err'); return; }

  btn.disabled = true;
  showMsg('login-msg', 'Menghubungi server...', 'ok');

  const result = await login(name, password);

  btn.disabled = false;

  if (!result.success) {
    showMsg('login-msg', result.error || 'Login gagal.', 'err');
    return;
  }

  State.teamData      = result.team;
  State.gameStartTime = result.team.startTime;

  showMsg('login-msg', `Selamat datang, ${result.team.name}!`, 'ok');

  setTimeout(() => {
    showScreen('screen-menu');
    renderMenu();
  }, 600);
}

// ── Daftar ────────────────────────────────────────────────────

export async function handleRegister() {
  const name     = document.getElementById('inp-register-name').value.trim();
  const password = document.getElementById('inp-register-password').value;
  const btn      = document.getElementById('btn-team-register');

  if (!name)     { showMsg('register-msg', 'Nama tim tidak boleh kosong.', 'err'); return; }
  if (!password) { showMsg('register-msg', 'Password tidak boleh kosong.', 'err'); return; }

  btn.disabled = true;
  showMsg('register-msg', 'Mendaftarkan tim...', 'ok');

  const result = await register(name, password);

  btn.disabled = false;

  if (!result.success) {
    showMsg('register-msg', result.error || 'Daftar gagal.', 'err');
    return;
  }

  showMsg('register-msg', `Tim "${name}" berhasil didaftarkan! Silakan login.`, 'ok');

  setTimeout(() => {
    document.getElementById('inp-register-name').value = '';
    document.getElementById('inp-register-password').value = '';
    document.getElementById('inp-login-name').value = name;
    showLoginForm();
  }, 1200);
}

// ── Menu Pandora ──────────────────────────────────────────────

export function renderMenu() {
  const td = State.teamData;
  document.getElementById('menu-team-info').innerHTML = `<strong>${td.name}</strong>`;
}
