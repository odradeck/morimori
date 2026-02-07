/**
 * Render a header with back button and title.
 * @param {string} title
 * @param {string} [backHash] - hash to navigate back to (default: previous)
 */
export function renderHeader(container, title, backHash) {
  const header = document.createElement('div');
  header.className = 'header';
  header.innerHTML = `
    <button class="header-back" aria-label="뒤로가기">←</button>
    <div class="header-title">${title}</div>
  `;
  header.querySelector('.header-back').addEventListener('click', () => {
    if (backHash) {
      location.hash = backHash;
    } else {
      history.back();
    }
  });
  container.appendChild(header);
  return header;
}
