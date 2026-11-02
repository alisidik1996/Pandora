/**
 * =============================================================
 *  MODULE: Lock3 — Flappy Suara
 *  Tanggung jawab: Mini-game Flappy Bird dikendalikan suara.
 *  - Kontrol via mic (RMS) atau fallback ketuk layar / Spasi.
 *  - 15 digit acak digenerate per tim, disimpan di localStorage.
 *  - Digit TETAP SAMA meskipun main ulang.
 *  - Setelah skor 15, tim input PIN 15-digit dari catatan recorder.
 * =============================================================
 */

import { FLAPPY_PIPE_GAP, FLAPPY_PIPE_SPEED, FLAPPY_GRAVITY, FLAPPY_FLAP, PIN_L3, FLAPPY_THRESHOLD_OFFSET, FLAPPY_THRESHOLD_MAX } from './config.js';
import { State }                    from './state.js';
import { saveProgress }             from './api.js';
import { showMsg, showScreen }      from './utils.js';
import { initMic, stopMic, getMicRMS, setMicAnimFrame } from './mic.js';
import { unlockLock, renderBox }    from './box.js';
import { getPinValue, initPinInputs, clearPinInputs } from './pin-input.js';

// ── State privat ──────────────────────────────────────────────
let flappyRunning  = false;
let flappyAnimId   = null;
let flappyScore    = 0;
let flappyThreshold = 0.20;
let flappyMicOk    = false;
let flappyFallback = false;
let smoothedRMS    = 0;

let bird       = null;
let pipes      = [];
let flappyFrame = 0;
let pipeSpawned = 0; // track total pipa yang udah spawn
const pipeDigits = PIN_L3.split('').map(Number); // [8,3,9,1,4,7,0,2,6,5,8,1,4,9,3]

// ── Init ──────────────────────────────────────────────────────

export function initLock3Screen() {
  flappyRunning = false;
  if (flappyAnimId) { cancelAnimationFrame(flappyAnimId); flappyAnimId = null; }

  // Remove old listener jika ada
  document.removeEventListener('keydown', _spaceHandler);

  document.getElementById('btn-l3-start').disabled    = true;
  document.getElementById('l3-mic-status').textContent = 'Tekan Kalibrasi untuk mulai.';
  document.getElementById('l3-game-msg').style.display = 'none';

  if (State.teamData.locks.l3) {
    // Tampilkan game area tapi disable semua button
    document.getElementById('l3-game-area').style.display = 'block';
    document.getElementById('l3-pin-area').style.display  = 'none';

    document.getElementById('btn-l3-calibrate').disabled = true;
    document.getElementById('btn-l3-start').disabled = true;

    const msgDiv = document.getElementById('l3-game-msg');
    if (msgDiv) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'msg msg-ok';
      msgDiv.textContent = 'Lock sudah terbuka!';
    }
    return;
  }
  document.getElementById('l3-game-area').style.display = 'block';
  document.getElementById('l3-pin-area').style.display  = 'none';

  _setupCanvas();
  _drawIdle();

  // Fallback: ketuk layar
  const canvas = document.getElementById('flappy-canvas');
  canvas.ontouchstart = e => {
    e.preventDefault();
    if (flappyFallback && flappyRunning && bird) bird.y -= 40;
  };

  // Fallback: Spasi
  document.addEventListener('keydown', _spaceHandler);
}

function _spaceHandler(e) {
  if (e.code === 'Space' && flappyFallback && flappyRunning && bird) {
    e.preventDefault();
    bird.y -= 40;
  }
}

// ── Canvas setup ──────────────────────────────────────────────

function _setupCanvas() {
  const canvas  = document.getElementById('flappy-canvas');
  const w       = canvas.parentElement.clientWidth - 32;
  canvas.width  = w;
  canvas.height = 300;
}

function _drawIdle() {
  const canvas = document.getElementById('flappy-canvas');
  const ctx    = canvas.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f0c040';
  ctx.font = '18px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Kalibrasi mic lalu tekan Mulai', canvas.width / 2, canvas.height / 2);
}

// ── Kalibrasi mic ─────────────────────────────────────────────

export async function startFlappyCalibrate() {
  document.getElementById('btn-l3-calibrate').disabled    = true;
  document.getElementById('l3-mic-status').textContent     = 'Meminta izin mikrofon...';

  const ok = await initMic();
  if (!ok) {
    flappyFallback = true;
    flappyMicOk    = false;
    document.getElementById('l3-mic-status').textContent    = '⚠ Mic tidak tersedia. Mode fallback: ketuk layar atau tekan Spasi.';
    document.getElementById('btn-l3-calibrate').disabled    = false;
    document.getElementById('btn-l3-start').disabled        = false;
    document.getElementById('l3-threshold-txt').textContent = 'Mode fallback (tanpa mic).';
    flappyThreshold = 0.20;
    _startVolMeter();
    return;
  }

  flappyFallback = false;
  flappyMicOk    = true;
  document.getElementById('l3-mic-status').textContent = 'Kalibrasi: diam selama 2 detik...';

  const samples = [];
  const start   = Date.now();
  const cal     = setInterval(() => {
    samples.push(getMicRMS());
    if (Date.now() - start >= 2000) {
      clearInterval(cal);
      const avg   = samples.reduce((a, b) => a + b, 0) / samples.length;
      flappyThreshold = Math.min(avg + FLAPPY_THRESHOLD_OFFSET, FLAPPY_THRESHOLD_MAX);
      document.getElementById('l3-threshold-txt').textContent = `Threshold: ${flappyThreshold.toFixed(3)} (suara dasar ${avg.toFixed(3)})`;
      document.getElementById('l3-mic-status').textContent    = 'Kalibrasi selesai. Siap bermain!';
      document.getElementById('btn-l3-calibrate').disabled    = false;
      document.getElementById('btn-l3-start').disabled        = false;
      _startVolMeter();
    }
  }, 100);
}

function _startVolMeter() {
  const fill = document.getElementById('l3-vol-fill');
  const line = document.getElementById('l3-vol-line');
  function loop() {
    fill.style.width = Math.min(getMicRMS() * 400, 100) + '%';
    line.style.left  = Math.min(flappyThreshold * 400, 100) + '%';
    const id = requestAnimationFrame(loop);
    setMicAnimFrame(id);
    flappyAnimId = id; // track agar bisa di-cancel
  }
  loop();
}

// ── Game ──────────────────────────────────────────────────────

export function startFlappyGame() {
  if (flappyRunning) return;
  document.getElementById('btn-l3-start').disabled     = true;
  document.getElementById('l3-game-msg').style.display = 'none';

  const canvas = document.getElementById('flappy-canvas');
  const W = canvas.width, H = canvas.height;

  bird         = { x: W * 0.2, y: H / 2, r: 14 };
  pipes        = [];
  flappyScore  = 0;
  flappyFrame  = 0;
  pipeSpawned  = 0; // reset counter
  smoothedRMS  = 0; // reset smoothing
  flappyRunning = true;

  document.getElementById('l3-score').textContent = 'Skor: 0 / 15';

  if (flappyAnimId) cancelAnimationFrame(flappyAnimId);
  _gameLoop();
}

function _gameLoop() {
  if (!flappyRunning) return;

  const canvas = document.getElementById('flappy-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Kontrol suara + Fisika (linear movement)
  if (flappyMicOk && !flappyFallback) {
    const rms = getMicRMS();
    // Haluskan RMS biar nggak jitter
    smoothedRMS = smoothedRMS * 0.6 + rms * 0.4;

    if (smoothedRMS > flappyThreshold) {
      bird.y -= 2.2; // suara kencang = naik pelan
    } else {
      bird.y += 2.0; // suara pelan/diam = turun pelan
    }

    document.getElementById('l3-vol-fill').style.width = Math.min(rms * 400, 100) + '%';
  } else {
    // Fallback mode tetap pakai gravity
    bird.y += 2.0;
  }

  // Langit cuma mentok, jangan mati
  if (bird.y - bird.r < 0) bird.y = bird.r;

  // Spawn pipa
  const PIPE_INTERVAL = Math.floor(180 / FLAPPY_PIPE_SPEED);
  if (flappyFrame % PIPE_INTERVAL === 0) {
    const minTop = 60, maxTop = H - FLAPPY_PIPE_GAP - 60;
    const topH   = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
    if (pipeSpawned < 15) {
      pipes.push({ x: W + 40, topH, digit: pipeDigits[pipeSpawned], passed: false, index: pipeSpawned });
      pipeSpawned++;
    }
  }

  // Gerak pipa
  pipes.forEach(p => { p.x -= FLAPPY_PIPE_SPEED; });

  // Cek lewat pipa
  pipes.forEach(p => {
    if (!p.passed && p.x + 40 < bird.x) {
      p.passed = true;
      flappyScore++;
      document.getElementById('l3-score').textContent = `Skor: ${flappyScore} / 15`;
    }
  });

  // Hapus pipa yang sudah keluar layar
  pipes = pipes.filter(p => p.x > -60);

  // Gambar latar
  ctx.fillStyle = '#0d1a0d';
  ctx.fillRect(0, 0, W, H);

  // Gambar pipa
  pipes.forEach(p => {
    const showDigit = p.x < W + 10 && p.x + 40 > bird.x - 40;

    ctx.fillStyle = '#2a5a2a';
    ctx.fillRect(p.x, 0, 40, p.topH);
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(p.x - 4, p.topH - 20, 48, 20);

    const botY = p.topH + FLAPPY_PIPE_GAP;
    ctx.fillStyle = '#2a5a2a';
    ctx.fillRect(p.x, botY, 40, H - botY);
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(p.x - 4, botY, 48, 20);

    // Digit tampil besar & jelas saat pipa melewati burung
    if (showDigit) {
      ctx.fillStyle  = '#f0c040';
      ctx.font       = 'bold 32px system-ui';
      ctx.textAlign  = 'center';
      ctx.fillText(String(p.digit), p.x + 20, p.topH + FLAPPY_PIPE_GAP / 2 + 12);
    }
  });

  // Gambar burung
  ctx.fillStyle = '#f0c040';
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(bird.x + 5, bird.y - 3, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e05050';
  ctx.beginPath();
  ctx.moveTo(bird.x + bird.r,      bird.y);
  ctx.lineTo(bird.x + bird.r + 10, bird.y + 4);
  ctx.lineTo(bird.x + bird.r,      bird.y + 8);
  ctx.closePath();
  ctx.fill();

  // Deteksi tabrakan - mati hanya kalau nabrak pipa atau lantai bawah
  let dead = bird.y + bird.r >= H; // lantai bawah
  pipes.forEach(p => {
    if (bird.x + bird.r > p.x + 4 && bird.x - bird.r < p.x + 36) {
      if (bird.y - bird.r < p.topH || bird.y + bird.r > p.topH + FLAPPY_PIPE_GAP) dead = true;
    }
  });

  flappyFrame++;

  if (dead) {
    flappyRunning = false;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e05050';
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Nabrak! Skor: ' + flappyScore, W / 2, H / 2 - 20);
    ctx.fillStyle = '#f0c040';
    ctx.font = '16px system-ui';
    ctx.fillText('Digit tetap sama – main ulang', W / 2, H / 2 + 14);

    const msgEl = document.getElementById('l3-game-msg');
    msgEl.className   = 'msg msg-err';
    msgEl.textContent = `Nabrak di skor ${flappyScore}. Digit pipa tetap sama. Tekan "Main Ulang" untuk coba lagi.`;
    msgEl.style.display = 'block';
    document.getElementById('btn-l3-start').disabled = false;
    return;
  }

  if (flappyScore >= 15) {
    flappyRunning = false;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#50c878';
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Berhasil! 15 pipa terlewati!', W / 2, H / 2);
    setTimeout(() => {
      document.getElementById('l3-game-area').style.display = 'none';
      document.getElementById('l3-pin-area').style.display  = 'block';
      initPinInputs('#l3-pin-group');
    }, 1200);
    return;
  }

  flappyAnimId = requestAnimationFrame(_gameLoop);
}

// ── PIN ───────────────────────────────────────────────────────

export function checkLock3() {
  const val = getPinValue('#l3-pin-group');
  if (!val || val.length !== 15) {
    showMsg('l3-msg', 'Masukkan 15 digit PIN.', 'err');
    return;
  }

  if (val === PIN_L3) {
    showMsg('l3-msg', 'Lock terbuka!', 'ok');
    unlockLock('l3');
    stopMic();
  } else {
    showMsg('l3-msg', 'PIN salah.', 'err');
  }
}

export function resetFlappy() {
  document.getElementById('l3-pin-area').style.display  = 'none';
  document.getElementById('l3-game-area').style.display = 'block';
  document.getElementById('l3-game-msg').style.display  = 'none';
  clearPinInputs('#l3-pin-group');
  flappyScore = 0;
  pipeSpawned = 0;
  document.getElementById('l3-score').textContent = 'Skor: 0 / 15';
  document.getElementById('btn-l3-start').disabled = false;
  _drawIdle();
}

// ── Navigasi kembali ──────────────────────────────────────────

export function backToBox3() {
  flappyRunning = false;
  if (flappyAnimId) { cancelAnimationFrame(flappyAnimId); flappyAnimId = null; }
  stopMic();
  document.removeEventListener('keydown', _spaceHandler);
  import('./box.js').then(m => { m.renderBox(); m.backToBox(); });
}
