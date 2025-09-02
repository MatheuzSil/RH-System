// DOM Helper Functions
export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// Currency formatter for Brazilian Real
export function brl(value) {
  return (value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Create button element
export function btn(label, onClick, className = '') {
  const button = document.createElement('button');
  button.textContent = label;
  button.className = 'btn small' + (className ? ' ' + className : '');
  button.onclick = onClick;
  return button;
}

// Generate unique ID
export function uid(prefix = 'ID') {
  return prefix + '_' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Show/Hide elements
export function show(element) {
  if (typeof element === 'string') {
    element = qs(element);
  }
  if (element) {
    element.classList.remove('hidden');
  }
}

export function hide(element) {
  if (typeof element === 'string') {
    element = qs(element);
  }
  if (element) {
    element.classList.add('hidden');
  }
}

// Format date to Brazilian format
export function formatDateBR(dateString) {
  if (!dateString) return 'Não informado';
  return new Date(dateString).toLocaleDateString('pt-BR');
}

// Create employee initials for avatar
export function getInitials(name) {
  if (!name) return '??';
  return name.split(' ')
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Debounce function for search
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show notification/alert with better styling (optional enhancement)
export function notify(message, type = 'info') {
  // For now, just use alert, but can be enhanced with toast notifications
  alert(message);
}

// Validate email format
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize string for HTML
export function sanitizeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
