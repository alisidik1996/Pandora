/**
 * =============================================================
 *  MODULE: Mic
 *  Tanggung jawab: Web Audio API — inisialisasi, pembacaan RMS,
 *  dan cleanup mikrofon. Dipakai oleh Lock3 (Flappy) dan Lock4 (Sunyi).
 *
 *  CATATAN: Mic hanya bekerja di localhost atau HTTPS, bukan file://
 *  iOS: izin mic HARUS dipicu dari klik tombol user (tombol Kalibrasi).
 * =============================================================
 */

let micStream   = null;
let micContext  = null;
let micAnalyser = null;
export let micAnimFrame = null;

/** Hentikan dan bersihkan semua resource mic. Panggil saat pindah layar. */
export function stopMic() {
  if (micAnimFrame) { cancelAnimationFrame(micAnimFrame); micAnimFrame = null; }
  if (micStream)    { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  if (micContext && micContext.state !== 'closed') { micContext.close(); micContext = null; }
  micAnalyser = null;
}

/** Set micAnimFrame dari luar (dipakai modul Flappy). */
export function setMicAnimFrame(id) { micAnimFrame = id; }

/**
 * Inisialisasi mikrofon via getUserMedia.
 * @returns {Promise<boolean>} true jika berhasil, false jika ditolak / tidak tersedia.
 */
export async function initMic() {
  stopMic();
  try {
    micStream   = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micContext  = new (window.AudioContext || window.webkitAudioContext)();
    const src   = micContext.createMediaStreamSource(micStream);
    micAnalyser = micContext.createAnalyser();
    micAnalyser.fftSize = 512;
    src.connect(micAnalyser);
    return true;
  } catch {
    return false;
  }
}

/**
 * Baca nilai RMS (Root Mean Square) dari buffer time-domain mikrofon.
 * Nilai 0.0 = senyap, ~1.0 = sangat keras.
 * @returns {number}
 */
export function getMicRMS() {
  if (!micAnalyser) return 0;
  const buf = new Float32Array(micAnalyser.fftSize);
  micAnalyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}
