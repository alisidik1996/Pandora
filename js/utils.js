/**
 * =============================================================
 *  MODULE: Utils
 *  Tanggung jawab: Helper functions UI yang dipakai lintas modul.
 * =============================================================
 */

/** Tampilkan layar berdasarkan id, sembunyikan yang lain. */
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

  // Save screen state ke localStorage (skip intro)
  if (id !== 'screen-intro') {
    localStorage.setItem('pb_last_screen', id);
  }
}

/** Format durasi milidetik → "Xj Ym Zd" atau "Ym Zd". */
export function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}j ${m % 60}m ${s % 60}d`;
  return `${m}m ${s % 60}d`;
}

/** Toggle visibilitas elemen hint. */
export function toggleHint(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

/**
 * Tampilkan pesan di elemen dengan id tertentu.
 * @param {string} id  - id elemen
 * @param {string} text
 * @param {'ok'|'err'} type
 */
export function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'msg ' + (type === 'ok' ? 'msg-ok' : 'msg-err');
  el.textContent = text;
  el.style.display = 'block';
}

/** Sembunyikan dan kosongkan elemen pesan. */
export function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; el.textContent = ''; }
}

/** Hitung SHA-256 dari string, kembalikan hex string. */
export async function sha256hex(str) {
  try {
    const buf     = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    throw new Error('Browser tidak support crypto.subtle');
  }
}
