let hideTimer = null;
let removeTimer = null;
let currentToast = null;

function getToastRoot() {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    document.body.appendChild(root);
  }
  return root;
}

export function showToast(message, type = 'info', duration = 900) {
  const root = getToastRoot();

  if (currentToast) {
    currentToast.remove();
    currentToast = null;
  }

  const toast = document.createElement('div');
  toast.className = `app-toast app-toast-${type}`;
  toast.textContent = message;
  root.appendChild(toast);
  currentToast = toast;

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  if (hideTimer) clearTimeout(hideTimer);
  if (removeTimer) clearTimeout(removeTimer);

  hideTimer = setTimeout(() => {
    toast.classList.remove('show');
    removeTimer = setTimeout(() => {
      toast.remove();
      if (currentToast === toast) currentToast = null;
    }, 180);
  }, duration);
}
