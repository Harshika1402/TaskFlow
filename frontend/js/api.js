/**
 * TaskFlow Centralized API Client
 * Manages JWT tokens, HTTP requests, auto-logout on 401, and unified error handling.
 */

const API_BASE = '/api';

const Storage = {
  getToken: () => localStorage.getItem('taskflow_token'),
  setToken: (token) => localStorage.setItem('taskflow_token', token),
  removeToken: () => localStorage.removeItem('taskflow_token'),
  getUser: () => {
    const raw = localStorage.getItem('taskflow_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user) => localStorage.setItem('taskflow_user', JSON.stringify(user)),
  clearSession: () => {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
  }
};

/**
 * Generic Fetch Wrapper with JSON body and JWT Header Injection
 */
async function request(endpoint, options = {}) {
  const token = Storage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Automatic session invalidation if 401
      if (response.status === 401) {
        Storage.clearSession();
        // Redirect to login if not already there
        if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
          window.location.href = 'index.html';
        }
      }
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Auth API Services
 */
const authAPI = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => {
    Storage.clearSession();
    window.location.href = 'index.html';
  }
};

/**
 * Task API Services
 */
const taskAPI = {
  getTasks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/tasks${queryString}`, { method: 'GET' });
  },
  getStats: () => request('/tasks/stats/summary', { method: 'GET' }),
  getTaskById: (id) => request(`/tasks/${id}`, { method: 'GET' }),
  createTask: (payload) => request('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' })
};

/**
 * User Profile Services
 */
const userAPI = {
  getProfile: () => request('/users/profile', { method: 'GET' }),
  updateProfile: (payload) => request('/users/profile', { method: 'PUT', body: JSON.stringify(payload) })
};

/**
 * Global Toast Notification Helper
 */
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success'
    ? `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`
    : type === 'error'
    ? `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`
    : `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto remove after 3.2s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}
