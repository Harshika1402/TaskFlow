/**
 * TaskFlow Main Application Controller (Dashboard)
 */

// Application State
const state = {
  user: null,
  tasks: [],
  currentFilter: 'All',
  currentSort: 'recentlyCreated',
  searchQuery: '',
  editingTaskId: null,
  deletingTaskId: null,
  activeView: 'tasks' // 'tasks' or 'settings'
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authenticate session
  const token = Storage.getToken();
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  state.user = Storage.getUser();
  if (!state.user) {
    try {
      const res = await userAPI.getProfile();
      state.user = res.user;
      Storage.setUser(res.user);
    } catch (e) {
      authAPI.logout();
      return;
    }
  }

  // 2. Initialize UI Components
  initUserInterface();
  setupEventListeners();

  // 3. Load Tasks and Dynamic Statistics
  await refreshDashboardData();
});

/**
 * Initialize User Profile and Dynamic Greetings
 */
function initUserInterface() {
  const userNameElements = document.querySelectorAll('.user-display-name');
  const userEmailElements = document.querySelectorAll('.user-display-email');
  const userAvatarElements = document.querySelectorAll('.user-display-avatar');
  const greetingElement = document.getElementById('dashboard-greeting-title');

  const displayName = state.user?.name || 'User';
  const displayEmail = state.user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  userNameElements.forEach((el) => (el.textContent = displayName));
  userEmailElements.forEach((el) => (el.textContent = displayEmail));
  userAvatarElements.forEach((el) => (el.textContent = initial));

  // Determine time-of-day greeting
  if (greetingElement) {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17) timeGreeting = 'Good evening';
    greetingElement.textContent = `${timeGreeting}, ${displayName.split(' ')[0]}`;
  }

  // Set default due date in Add Modal to tomorrow
  const dueDateInput = document.getElementById('task-due-date');
  if (dueDateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    dueDateInput.value = tomorrow.toISOString().slice(0, 16);
  }
}

/**
 * Event Listeners for Filters, Search, Modals, and Navigation
 */
function setupEventListeners() {
  // Mobile drawer toggle
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebar-close-btn');

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  }
  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', () => sidebar.classList.remove('mobile-open'));
  }

  // Logout triggers
  const logoutButtons = document.querySelectorAll('.trigger-logout');
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      authAPI.logout();
    });
  });

  // Sidebar navigation switching
  const navLinks = document.querySelectorAll('.nav-link[data-view]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      handleNavigation(targetView);
    });
  });

  // Quick "+ Add Task" button in sidebar and top area
  const openAddButtons = document.querySelectorAll('.trigger-add-task');
  openAddButtons.forEach((btn) => {
    btn.addEventListener('click', () => openTaskModal());
  });

  // Real-time Search input (Instant client filtering)
  const searchInput = document.getElementById('task-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderTasks();
    });
  }

  // Filter Pills (All, Pending, In Progress, Completed, High Priority)
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentFilter = pill.getAttribute('data-filter');
      renderTasks();
    });
  });

  // Sort Selector
  const sortSelect = document.getElementById('task-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.currentSort = e.target.value;
      renderTasks();
    });
  }

  // Task Form Submission (Create or Edit)
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
  }

  // Modal Close Buttons
  const closeButtons = document.querySelectorAll('.modal-close-trigger');
  closeButtons.forEach((btn) => {
    btn.addEventListener('click', closeAllModals);
  });

  // Modal Backdrop Click (click outside to close)
  const modalBackdrops = document.querySelectorAll('.modal-backdrop');
  modalBackdrops.forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeAllModals();
    });
  });

  // Delete Confirmation Button
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }

  // Profile Form Submission
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }
}

/**
 * Handle View Switching (Tasks View vs Settings View)
 */
function handleNavigation(view) {
  state.activeView = view;

  const tasksView = document.getElementById('tasks-view');
  const settingsView = document.getElementById('settings-view');
  const navLinks = document.querySelectorAll('.nav-link[data-view]');

  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('data-view') === view);
  });

  if (view === 'tasks') {
    if (tasksView) tasksView.style.display = 'block';
    if (settingsView) settingsView.classList.remove('active');
  } else if (view === 'completed') {
    if (tasksView) tasksView.style.display = 'block';
    if (settingsView) settingsView.classList.remove('active');
    // Set Completed filter pill active
    const completedPill = document.querySelector('.filter-pill[data-filter="Completed"]');
    if (completedPill) completedPill.click();
  } else if (view === 'settings') {
    if (tasksView) tasksView.style.display = 'none';
    if (settingsView) settingsView.classList.add('active');
    loadProfileIntoForm();
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');
}

/**
 * Fetch Tasks and Dynamic Statistics from REST API
 */
async function refreshDashboardData() {
  try {
    const [tasksRes, statsRes] = await Promise.all([
      taskAPI.getTasks(),
      taskAPI.getStats()
    ]);

    state.tasks = tasksRes.tasks || [];
    renderStatistics(statsRes.stats);
    renderTasks();
  } catch (err) {
    console.error('Error refreshing dashboard data:', err);
    showToast('Failed to load tasks from server.', 'error');
  }
}

/**
 * Update 4 Real Statistics Cards
 */
function renderStatistics(stats) {
  if (!stats) return;
  const totalEl = document.getElementById('stat-total-value');
  const pendingEl = document.getElementById('stat-pending-value');
  const progressEl = document.getElementById('stat-progress-value');
  const completedEl = document.getElementById('stat-completed-value');

  if (totalEl) totalEl.textContent = formatStatNumber(stats.total);
  if (pendingEl) pendingEl.textContent = formatStatNumber(stats.pending);
  if (progressEl) progressEl.textContent = formatStatNumber(stats.inProgress);
  if (completedEl) completedEl.textContent = formatStatNumber(stats.completed);
}

function formatStatNumber(num) {
  if (num === undefined || num === null) return '00';
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Filter, Sort, and Render Tasks Grid
 */
function renderTasks() {
  const container = document.getElementById('tasks-grid');
  const emptyState = document.getElementById('tasks-empty-state');
  if (!container) return;

  // 1. Filter
  let filtered = state.tasks.filter((t) => {
    // Status / Priority Pill filter
    if (state.currentFilter === 'High Priority') {
      if (t.priority !== 'High') return false;
    } else if (state.currentFilter !== 'All') {
      if (t.status !== state.currentFilter) return false;
    }

    // Search query filter (matches title or description)
    if (state.searchQuery) {
      const matchTitle = t.title?.toLowerCase().includes(state.searchQuery);
      const matchDesc = t.description?.toLowerCase().includes(state.searchQuery);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });

  // 2. Sort
  filtered.sort((a, b) => {
    if (state.currentSort === 'dueDate') {
      return new Date(a.due_date) - new Date(b.due_date);
    } else if (state.currentSort === 'priority') {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    } else {
      // Recently Created
      return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // 3. Render Empty State or Cards
  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = filtered
    .map((task) => createTaskCardHTML(task))
    .join('');

  // Attach card event listeners
  attachCardActionListeners(container);
}

/**
 * Generate HTML string for an individual Task Card
 */
function createTaskCardHTML(task) {
  const isCompleted = task.status === 'Completed';
  const dueDateObj = new Date(task.due_date);
  const isOverdue = !isCompleted && dueDateObj < new Date();
  const formattedDueDate = dueDateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const priorityClass = `badge-priority-${task.priority.toLowerCase()}`;
  const statusClass = `badge-status-${task.status.toLowerCase().replace(' ', '-')}`;

  return `
    <div class="task-card ${isCompleted ? 'task-completed-card' : ''}" data-id="${task.id}">
      <div class="task-card-header">
        <div class="task-badges">
          <span class="badge ${priorityClass}">${task.priority}</span>
          <span class="badge ${statusClass}">${task.status}</span>
        </div>
        <div class="task-actions">
          <button class="btn-task-action action-view" title="View Details" data-id="${task.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="btn-task-action action-edit" title="Edit Task" data-id="${task.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-task-action action-complete" title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}" data-id="${task.id}" data-current="${task.status}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </button>
          <button class="btn-task-action action-delete" title="Delete Task" data-id="${task.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>

      <h3 class="task-title">${escapeHTML(task.title)}</h3>
      <p class="task-desc">${escapeHTML(task.description || 'No description provided.')}</p>

      <div class="task-card-footer">
        <div class="task-due-date ${isOverdue ? 'is-overdue' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Due: ${formattedDueDate} ${isOverdue ? '(Overdue)' : ''}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach Card Click Actions (View, Edit, Complete, Delete)
 */
function attachCardActionListeners(container) {
  // View Details
  container.querySelectorAll('.action-view').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openTaskDetailsModal(id);
    });
  });

  // Edit Task
  container.querySelectorAll('.action-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openTaskModal(id);
    });
  });

  // Toggle Complete / Status
  container.querySelectorAll('.action-complete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const current = btn.getAttribute('data-current');
      const nextStatus = current === 'Completed' ? 'Pending' : 'Completed';

      try {
        await taskAPI.updateStatus(id, nextStatus);
        showToast(nextStatus === 'Completed' ? 'Task marked as completed.' : 'Task reopened.', 'success');
        await refreshDashboardData();
      } catch (err) {
        showToast(err.message || 'Failed to update task status.', 'error');
      }
    });
  });

  // Delete Task
  container.querySelectorAll('.action-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openDeleteModal(id);
    });
  });
}

/**
 * Open Add or Edit Task Modal
 */
function openTaskModal(taskId = null) {
  state.editingTaskId = taskId;
  const modal = document.getElementById('task-modal');
  const titleEl = document.getElementById('task-modal-title');
  const submitBtn = document.getElementById('task-modal-submit-btn');

  const titleInput = document.getElementById('task-title');
  const descInput = document.getElementById('task-description');
  const prioritySelect = document.getElementById('task-priority');
  const statusSelect = document.getElementById('task-status');
  const dueDateInput = document.getElementById('task-due-date');

  if (taskId) {
    // Edit Mode
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    titleEl.textContent = 'Edit Task';
    submitBtn.textContent = 'Save Changes';

    titleInput.value = task.title;
    descInput.value = task.description || '';
    prioritySelect.value = task.priority;
    statusSelect.value = task.status;

    const dateVal = new Date(task.due_date);
    dateVal.setMinutes(dateVal.getMinutes() - dateVal.getTimezoneOffset());
    dueDateInput.value = dateVal.toISOString().slice(0, 16);
  } else {
    // Add Mode
    titleEl.textContent = 'Add New Task';
    submitBtn.textContent = 'Create Task';

    titleInput.value = '';
    descInput.value = '';
    prioritySelect.value = 'Medium';
    statusSelect.value = 'Pending';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    dueDateInput.value = tomorrow.toISOString().slice(0, 16);
  }

  modal.classList.add('open');
  titleInput.focus();
}

/**
 * Handle Add/Edit Task Form Submission
 */
async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('task-modal-submit-btn');

  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const priority = document.getElementById('task-priority').value;
  const status = document.getElementById('task-status').value;
  const dueDate = document.getElementById('task-due-date').value;

  if (!title) {
    showToast('Task title is required.', 'error');
    return;
  }
  if (!dueDate) {
    showToast('Due date is required.', 'error');
    return;
  }

  const payload = {
    title,
    description,
    priority,
    status,
    due_date: new Date(dueDate).toISOString()
  };

  try {
    submitBtn.disabled = true;

    if (state.editingTaskId) {
      await taskAPI.updateTask(state.editingTaskId, payload);
      showToast('Task updated successfully.', 'success');
    } else {
      await taskAPI.createTask(payload);
      showToast('Task created successfully.', 'success');
    }

    closeAllModals();
    await refreshDashboardData();
  } catch (err) {
    showToast(err.message || 'Error saving task.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Open Task Details View Modal
 */
function openTaskDetailsModal(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  const modal = document.getElementById('task-details-modal');
  document.getElementById('detail-title').textContent = task.title;
  document.getElementById('detail-desc').textContent = task.description || 'No description provided.';
  
  const priorityBadge = document.getElementById('detail-priority-badge');
  priorityBadge.textContent = task.priority;
  priorityBadge.className = `badge badge-priority-${task.priority.toLowerCase()}`;

  const statusBadge = document.getElementById('detail-status-badge');
  statusBadge.textContent = task.status;
  statusBadge.className = `badge badge-status-${task.status.toLowerCase().replace(' ', '-')}`;

  const dueFormat = new Date(task.due_date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('detail-due-date').textContent = dueFormat;

  const createdFormat = new Date(task.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  document.getElementById('detail-created-date').textContent = createdFormat;

  // Actions inside details modal
  const editBtn = document.getElementById('detail-action-edit');
  const deleteBtn = document.getElementById('detail-action-delete');
  const completeBtn = document.getElementById('detail-action-complete');

  editBtn.onclick = () => {
    closeAllModals();
    openTaskModal(task.id);
  };

  deleteBtn.onclick = () => {
    closeAllModals();
    openDeleteModal(task.id);
  };

  completeBtn.textContent = task.status === 'Completed' ? 'Mark Pending' : 'Mark Completed';
  completeBtn.onclick = async () => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await taskAPI.updateStatus(task.id, nextStatus);
      showToast(nextStatus === 'Completed' ? 'Task marked as completed.' : 'Task reopened.', 'success');
      closeAllModals();
      await refreshDashboardData();
    } catch (err) {
      showToast(err.message || 'Status update failed.', 'error');
    }
  };

  modal.classList.add('open');
}

/**
 * Open Delete Confirmation Modal
 */
function openDeleteModal(taskId) {
  state.deletingTaskId = taskId;
  const modal = document.getElementById('delete-modal');
  modal.classList.add('open');
}

/**
 * Confirm Permanent Deletion
 */
async function handleConfirmDelete() {
  if (!state.deletingTaskId) return;

  const btn = document.getElementById('confirm-delete-btn');
  try {
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    await taskAPI.deleteTask(state.deletingTaskId);
    showToast('Task deleted successfully.', 'success');
    closeAllModals();
    await refreshDashboardData();
  } catch (err) {
    showToast(err.message || 'Failed to delete task.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete Task';
    state.deletingTaskId = null;
  }
}

/**
 * Settings / Profile Management
 */
function loadProfileIntoForm() {
  const nameInput = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  if (nameInput && state.user) nameInput.value = state.user.name;
  if (emailInput && state.user) emailInput.value = state.user.email;
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('settings-submit-btn');
  const name = document.getElementById('settings-name').value.trim();
  const currentPassword = document.getElementById('settings-current-pass').value;
  const newPassword = document.getElementById('settings-new-pass').value;

  if (!name) {
    showToast('Name cannot be empty.', 'error');
    return;
  }

  const payload = { name };
  if (newPassword) {
    if (!currentPassword) {
      showToast('Current password is required to set a new password.', 'error');
      return;
    }
    payload.currentPassword = currentPassword;
    payload.newPassword = newPassword;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const res = await userAPI.updateProfile(payload);
    state.user.name = res.user.name;
    Storage.setUser(state.user);

    initUserInterface();
    showToast('Profile updated successfully.', 'success');

    // Reset password fields
    document.getElementById('settings-current-pass').value = '';
    document.getElementById('settings-new-pass').value = '';
  } catch (err) {
    showToast(err.message || 'Failed to update profile.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
}

/**
 * Close All Open Modals
 */
function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.remove('open'));
  state.editingTaskId = null;
}

/**
 * Security: Simple HTML sanitization
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
