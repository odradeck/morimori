/**
 * Show a modal dialog.
 * @param {Object} options
 * @param {string} options.icon - emoji icon
 * @param {string} options.title
 * @param {string} options.message
 * @param {Array<{label: string, class?: string, action: Function}>} options.buttons
 * @returns {Function} close function
 */
export function showModal({ icon, title, message, buttons = [] }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      ${icon ? `<div class="modal-icon">${icon}</div>` : ''}
      <div class="modal-title">${title}</div>
      <div class="modal-message">${message}</div>
      <div class="modal-actions"></div>
    </div>
  `;

  const actionsEl = overlay.querySelector('.modal-actions');
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.className = `btn ${btn.class || 'btn-primary'} btn-block`;
    button.textContent = btn.label;
    button.addEventListener('click', () => {
      close();
      if (btn.action) btn.action();
    });
    actionsEl.appendChild(button);
  });

  function close() {
    overlay.remove();
  }

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  return close;
}
