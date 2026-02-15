/**
 * Show a modal dialog.
 * @param {Object} options
 * @param {string} options.icon - emoji icon
 * @param {string} options.thumbnail - image path
 * @param {string} options.title
 * @param {string} options.message
 * @param {Array<{label: string, class?: string, action: Function}>} options.buttons
 * @returns {Function} close function
 */
export function showModal({ icon, thumbnail, title, message, buttons = [] }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" aria-label="닫기">✕</button>
      ${thumbnail ? `<img class="modal-thumbnail" src="${thumbnail}" alt="${title} 썸네일" />` : ''}
      ${!thumbnail && icon ? `<div class="modal-icon">${icon}</div>` : ''}
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

  const closeBtn = overlay.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', close);
  }

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  return close;
}
