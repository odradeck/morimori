/**
 * Render a header with back button and title.
 * @param {string} title
 * @param {string} [backHash] - hash to navigate back to (default: previous)
 * @param {{ hideBack?: boolean, center?: boolean, compact?: boolean }} [options]
 */
export function renderHeader(container, title, backHash, options = {}) {
  const { hideBack = false, center = false, compact = false } = options;
  const header = document.createElement('div');
  header.className = `header${hideBack ? ' header-no-back' : ''}${center ? ' header-centered' : ''}${compact ? ' header-compact' : ''}`;
  header.innerHTML = `
    ${hideBack ? '' : '<button class="header-back" aria-label="뒤로가기">←</button>'}
    <div class="header-title">${title}</div>
  `;
  if (!hideBack) {
    header.querySelector('.header-back').addEventListener('click', () => {
      if (backHash) {
        location.hash = backHash;
      } else {
        history.back();
      }
    });
  }
  container.appendChild(header);
  return header;
}
