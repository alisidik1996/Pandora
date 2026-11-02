/**
 * =============================================================
 *  MODULE: Config
 *  Tanggung jawab: Semua konstanta dan konfigurasi game.
 *  Edit file ini untuk menyetel ambang sensor sebelum game.
 * =============================================================
 */

// -------------------------------------------------------------
// PANIC HOLD (anti-cheat)
// -------------------------------------------------------------
export const PANIC_ENABLED = true; // false = matikan panic hold

// -------------------------------------------------------------
// SENSOR GERAK — SETEL AMBANG INI SAAT TES HP BESOK
// -------------------------------------------------------------
export const MOTION_THRESHOLD = 2.5; // perubahan vektor akselerasi antar sampel (m/s²)
export const MOTION_COUNT_LIMIT = 3;  // jumlah deteksi besar dalam 1 detik → dianggap bergerak

// -------------------------------------------------------------
// MIKROFON — LOCK 3 & LOCK 4
// -------------------------------------------------------------
// Lock 4 (Sunyi): threshold = baseline + offset ini
// Lebih besar = lebih toleran noise, lebih mudah pass
export const SILENCE_THRESHOLD_OFFSET = 0.10; // default 0.05 terlalu ketat

// Lock 3 (Flappy): threshold = baseline + offset ini
// Lebih besar = perlu suara lebih keras untuk flap, kurang sensitive
export const FLAPPY_THRESHOLD_OFFSET = 0.18; // default 0.12 terlalu sensitive
export const FLAPPY_THRESHOLD_MAX = 0.40;    // default 0.35

// -------------------------------------------------------------
// PIN GEMBOK (plaintext)
// Catatan: validasi client-side tidak 100% anti-cheat.
// Panic Hold + tugas fisik + pantauan fasilitator adalah lapisan utamanya.
// -------------------------------------------------------------
export const PIN_L1 = '17106';
export const PIN_L2 = '472913';
export const PIN_L3 = '839147026581493'; // Lock 3: 15 digit pipa
export const PIN_L6 = '971'; // Lock 6: 3 digit

// -------------------------------------------------------------
// FLAPPY BIRD
// -------------------------------------------------------------
export const FLAPPY_PIPE_GAP = 180;  // celah lebih lebar dari Flappy biasa
export const FLAPPY_PIPE_SPEED = 2.2;
export const FLAPPY_GRAVITY = 0.35;
export const FLAPPY_FLAP = -6.5;

// -------------------------------------------------------------
// STORAGE
// -------------------------------------------------------------
export const LS_KEY = 'pandoraBox_v1';

// -------------------------------------------------------------
// DEFINISI 6 GEMBOK
// -------------------------------------------------------------
export const LOCK_DEFS = [
  { id: 'l1', num: 1, name: '', icon: '', screen: 'screen-lock1' },
  { id: 'l2', num: 2, name: '', icon: '', screen: 'screen-lock2' },
  { id: 'l3', num: 3, name: '', icon: '', screen: 'screen-lock3' },
  { id: 'l4', num: 4, name: '', icon: '', screen: 'screen-lock4' },
  { id: 'l5', num: 5, name: '', icon: '', screen: 'screen-lock5' },
  { id: 'l6', num: 6, name: '', icon: '', screen: 'screen-lock6' },
];
