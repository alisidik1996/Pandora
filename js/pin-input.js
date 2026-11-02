/**
 * =============================================================
 *  MODULE: PIN Input Helper
 *  Auto-focus next box on digit entry
 * =============================================================
 */

export function initPinInputs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const inputs = container.querySelectorAll('.pin-digit');

  inputs.forEach((input, index) => {
    // Only allow digits
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');

      // Auto-focus next
      if (e.target.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    // Backspace moves to previous
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // Paste handler - distribute digits
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');

      for (let i = 0; i < paste.length && index + i < inputs.length; i++) {
        inputs[index + i].value = paste[i];
      }

      // Focus last filled or next empty
      const nextIndex = Math.min(index + paste.length, inputs.length - 1);
      inputs[nextIndex].focus();
    });
  });
}

export function getPinValue(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return '';

  const inputs = container.querySelectorAll('.pin-digit');
  return Array.from(inputs).map(i => i.value).join('');
}

export function clearPinInputs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const inputs = container.querySelectorAll('.pin-digit');
  inputs.forEach(i => i.value = '');
  if (inputs[0]) inputs[0].focus();
}
