const API = {
  async request(path, { method = 'GET', body, token } = {}) {
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error' }));
      throw new Error(err.error || 'Error del servidor');
    }
    return res.json();
  },
  register(data) { return this.request('/api/auth/register', { method: 'POST', body: data }); },
  login(data) { return this.request('/api/auth/login', { method: 'POST', body: data }); },
  logout(token) { return this.request('/api/auth/logout', { method: 'POST', token }); },
  me(token) { return this.request('/api/me', { token }); },
  updateProfile(token, data) { return this.request('/api/me', { method: 'PUT', token, body: data }); },
  changePassword(token, data) { return this.request('/api/me/password', { method: 'PUT', token, body: data }); },
  uploadAvatar(token, avatarData) { return this.request('/api/me/avatar', { method: 'POST', token, body: avatarData }); },
  getAvatarUrl(userId) { return `/api/me/avatar`; }, // This will be called with auth header
  deleteAvatar(token) { return this.request('/api/me/avatar', { method: 'DELETE', token }); },
  boards(token) { return this.request('/api/boards', { token }); },
  createBoard(token, data) { return this.request('/api/boards', { method: 'POST', token, body: data }); },
  getBoard(token, id) { return this.request(`/api/boards/${id}`, { token }); },
  updateBoard(token, id, data) { return this.request(`/api/boards/${id}`, { method: 'PUT', token, body: data }); },
  deleteBoard(token, id) { return this.request(`/api/boards/${id}`, { method: 'DELETE', token }); },
  invite(token, boardId, email) { return this.request(`/api/boards/${boardId}/members`, { method: 'POST', token, body: { email } }); },
  addList(token, boardId, title) { return this.request(`/api/boards/${boardId}/lists`, { method: 'POST', token, body: { title } }); },
  updateList(token, boardId, listId, data) { return this.request(`/api/boards/${boardId}/lists/${listId}`, { method: 'PUT', token, body: data }); },
  deleteList(token, boardId, listId) { return this.request(`/api/boards/${boardId}/lists/${listId}`, { method: 'DELETE', token }); },
  reorderLists(token, boardId, listOrder) { return this.request(`/api/boards/${boardId}/lists/reorder`, { method: 'PATCH', token, body: { listOrder } }); },
  addCard(token, boardId, listId, data) { return this.request(`/api/boards/${boardId}/lists/${listId}/cards`, { method: 'POST', token, body: data }); },
  updateCard(token, boardId, listId, cardId, data) { return this.request(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, { method: 'PUT', token, body: data }); },
  deleteCard(token, boardId, listId, cardId) { return this.request(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, { method: 'DELETE', token }); },
  moveCard(token, boardId, payload) { return this.request(`/api/boards/${boardId}/cards/move`, { method: 'PATCH', token, body: payload }); },
  assignCard(token, boardId, listId, cardId, userId) { return this.request(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/assignees`, { method: 'POST', token, body: { userId } }); },
  unassignCard(token, boardId, listId, cardId, userId) { return this.request(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/assignees/${userId}`, { method: 'DELETE', token }); },
  getBoardMembers(token, boardId) { return this.request(`/api/boards/${boardId}/members`, { token }); },
};

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  boards: [],
  currentBoard: null,
  members: [],
  theme: localStorage.getItem('theme') || 'light',
  boardCustomization: JSON.parse(localStorage.getItem('boardCustomization') || JSON.stringify({
    backgroundType: 'color',
    backgroundColor: '#0079bf',
    backgroundColorSecondary: '#026aa7',
    listColor: '#0079bf'
  }))
};

function setAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  renderTopActions();
}

function clearAuth() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  renderTopActions();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
  
  // Actualizar ícono del botón
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.textContent = state.theme === 'light' ? '🌙' : '☀️';
    themeBtn.title = state.theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
}

// Board Customization Functions
function applyBoardCustomization() {
  const bg = document.getElementById('board-background');
  const customization = state.boardCustomization;
  
  // Remove all background classes
  bg.className = 'board-background';
  
  // Apply background type
  bg.classList.add(`${customization.backgroundType}-bg`);
  
  // Apply custom colors
  bg.style.setProperty('--board-bg-primary', customization.backgroundColor);
  bg.style.setProperty('--board-bg-secondary', customization.backgroundColorSecondary || customization.backgroundColor);
  
  // Apply list colors
  document.documentElement.style.setProperty('--list-color', customization.listColor);
  
  // Save to localStorage
  localStorage.setItem('boardCustomization', JSON.stringify(customization));
}

function showCustomizationPanel() {
  const panel = document.getElementById('customization-panel');
  panel.classList.add('show');
  
  // Load current customization
  loadCustomizationPanel();
}

function hideCustomizationPanel() {
  const panel = document.getElementById('customization-panel');
  panel.classList.remove('show');
}

function loadCustomizationPanel() {
  const customization = state.boardCustomization;
  
  // Set background type
  document.querySelectorAll('.background-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.bg === customization.backgroundType);
  });
  
  // Set colors
  document.getElementById('custom-bg-color').value = customization.backgroundColor;
  document.getElementById('custom-list-color').value = customization.listColor;
  
  // Update color picker selections
  updateColorSelections();
}

function updateColorSelections() {
  const customization = state.boardCustomization;
  
  // Background color selections
  document.querySelectorAll('#bg-color-picker .color-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.color === customization.backgroundColor);
  });
  
  // List color selections
  document.querySelectorAll('#list-color-picker .color-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.color === customization.listColor);
  });
}

function saveCustomization() {
  const customization = state.boardCustomization;
  
  // Get values from inputs
  customization.backgroundColor = document.getElementById('custom-bg-color').value;
  customization.listColor = document.getElementById('custom-list-color').value;
  
  // Apply changes
  applyBoardCustomization();
  
  // Show success message
  showToast('Personalización guardada correctamente', 'success');
  
  // Hide panel
  hideCustomizationPanel();
}

function resetCustomization() {
  state.boardCustomization = {
    backgroundType: 'color',
    backgroundColor: '#0079bf',
    backgroundColorSecondary: '#026aa7',
    listColor: '#0079bf'
  };
  
  applyBoardCustomization();
  loadCustomizationPanel();
  showToast('Personalización restablecida', 'info');
}

// User Profile Functions
function showProfilePanel() {
  const panel = document.getElementById('profile-panel');
  panel.classList.add('show');
  
  // Load current user data
  loadProfilePanel();
}

function hideProfilePanel() {
  const panel = document.getElementById('profile-panel');
  panel.classList.remove('show');
}

function loadProfilePanel() {
  const user = state.user;
  
  // Load profile data
  document.getElementById('profile-name').value = user.name || '';
  document.getElementById('profile-email').value = user.email || '';
  
  // Load avatar
  updateAvatarDisplay();
}

function updateAvatarDisplay() {
  const avatarImg = document.getElementById('current-avatar');
  const avatarPlaceholder = document.getElementById('avatar-placeholder');
  
  if (state.user && state.user.hasAvatar) {
    avatarImg.src = API.getAvatarUrl(state.user.id);
    avatarImg.style.display = 'block';
    avatarPlaceholder.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarPlaceholder.style.display = 'flex';
    avatarPlaceholder.textContent = state.user ? state.user.name.charAt(0).toUpperCase() : '?';
  }
}

async function updateProfile() {
  try {
    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    
    if (!name || !email) {
      showToast('Nombre y email son requeridos', 'error');
      return;
    }
    
    const updatedUser = await API.updateProfile(state.token, { name, email });
    state.user = updatedUser;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Update UI
    renderTopActions();
    showToast('Perfil actualizado correctamente', 'success');
  } catch (err) {
    showToast('Error al actualizar perfil: ' + err.message, 'error');
  }
}

async function changePassword() {
  try {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Todos los campos de contraseña son requeridos', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    
    await API.changePassword(state.token, { currentPassword, newPassword });
    
    // Clear form
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    showToast('Contraseña cambiada correctamente', 'success');
  } catch (err) {
    showToast('Error al cambiar contraseña: ' + err.message, 'error');
  }
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Por favor selecciona un archivo de imagen válido', 'error');
    return;
  }
  
  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('La imagen es demasiado grande (máximo 2MB)', 'error');
    return;
  }
  
  // Read file as base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      await API.uploadAvatar(state.token, e.target.result);
      
      // Update user state
      state.user.hasAvatar = true;
      localStorage.setItem('user', JSON.stringify(state.user));
      
      // Update UI
      updateAvatarDisplay();
      renderTopActions();
      
      showToast('Avatar actualizado correctamente', 'success');
    } catch (err) {
      showToast('Error al subir avatar: ' + err.message, 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function deleteAvatar() {
  if (!confirm('¿Estás seguro de que quieres eliminar tu avatar?')) return;
  
  try {
    await API.deleteAvatar(state.token);
    
    // Update user state
    state.user.hasAvatar = false;
    localStorage.setItem('user', JSON.stringify(state.user));
    
    // Update UI
    updateAvatarDisplay();
    renderTopActions();
    
    showToast('Avatar eliminado correctamente', 'success');
  } catch (err) {
    showToast('Error al eliminar avatar: ' + err.message, 'error');
  }
}

function setupProfilePanel() {
  // Profile button
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', showProfilePanel);
  }

  // Profile form
  document.getElementById('update-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateProfile();
  });

  // Password form
  document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await changePassword();
  });

  // Avatar upload
  document.getElementById('avatar-upload').addEventListener('change', handleAvatarUpload);
  document.getElementById('delete-avatar').addEventListener('click', deleteAvatar);

  // Close panel
  document.getElementById('close-profile').addEventListener('click', hideProfilePanel);

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('profile-panel');
    const profileBtn = document.getElementById('profile-btn');
    
    if (!panel.contains(e.target) && e.target !== profileBtn && !profileBtn.contains(e.target)) {
      hideProfilePanel();
    }
  });
}

function setupCustomizationPanel() {
  // Botón para mostrar el panel
  const customizeBtn = document.getElementById('customize-btn');
  if (customizeBtn) {
    customizeBtn.addEventListener('click', showCustomizationPanel);
  }

  // Background type selection
  document.querySelectorAll('.background-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.background-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      state.boardCustomization.backgroundType = option.dataset.bg;
    });
  });

  // Color picker selections
  document.querySelectorAll('#bg-color-picker .color-option').forEach(option => {
    option.addEventListener('click', () => {
      state.boardCustomization.backgroundColor = option.dataset.color;
      document.getElementById('custom-bg-color').value = option.dataset.color;
      updateColorSelections();
    });
  });

  document.querySelectorAll('#list-color-picker .color-option').forEach(option => {
    option.addEventListener('click', () => {
      state.boardCustomization.listColor = option.dataset.color;
      document.getElementById('custom-list-color').value = option.dataset.color;
      updateColorSelections();
    });
  });

  // Custom color inputs
  document.getElementById('custom-bg-color').addEventListener('input', (e) => {
    state.boardCustomization.backgroundColor = e.target.value;
  });

  document.getElementById('custom-list-color').addEventListener('input', (e) => {
    state.boardCustomization.listColor = e.target.value;
  });

  // Action buttons
  document.getElementById('save-customization').addEventListener('click', saveCustomization);
  document.getElementById('reset-customization').addEventListener('click', resetCustomization);
  document.getElementById('cancel-customization').addEventListener('click', hideCustomizationPanel);

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('customization-panel');
    const customizeBtn = document.getElementById('customize-btn');
    
    if (!panel.contains(e.target) && e.target !== customizeBtn && !customizeBtn.contains(e.target)) {
      hideCustomizationPanel();
    }
  });
}

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toast-container');
  const template = document.getElementById('toast-template');
  const toast = template.content.cloneNode(true);
  const toastEl = toast.querySelector('.toast');
  const messageEl = toast.querySelector('.toast-message');
  const closeBtn = toast.querySelector('.toast-close');
  
  messageEl.textContent = message;
  toastEl.classList.add(type);
  
  // Auto-remove after duration
  const timeoutId = setTimeout(() => {
    removeToast(toastEl);
  }, duration);
  
  // Close button
  closeBtn.addEventListener('click', () => {
    clearTimeout(timeoutId);
    removeToast(toastEl);
  });
  
  container.appendChild(toast);
  
  // Auto-remove after animation
  setTimeout(() => {
    if (toastEl.parentNode) {
      removeToast(toastEl);
    }
  }, duration + 300);
}

function removeToast(toastEl) {
  toastEl.classList.add('fade-out');
  setTimeout(() => {
    if (toastEl.parentNode) {
      toastEl.parentNode.removeChild(toastEl);
    }
  }, 300);
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function renderTopActions() {
  const container = document.getElementById('top-actions');
  // Guardar los botones antes de limpiar
  const customizeBtn = document.getElementById('customize-btn');
  const themeBtn = document.getElementById('theme-toggle');
  const profileBtn = document.getElementById('profile-btn');
  container.innerHTML = '';

  // Volver a agregar los botones
  if (customizeBtn) {
    container.appendChild(customizeBtn);
  }
  if (themeBtn) {
    container.appendChild(themeBtn);
  }
  if (profileBtn) {
    container.appendChild(profileBtn);
  }

  if (state.user) {
    // User info with avatar
    const userContainer = document.createElement('div');
    userContainer.className = 'user-info';
    
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'user-avatar';
    
    if (state.user.hasAvatar) {
      const avatarImg = document.createElement('img');
      avatarImg.src = API.getAvatarUrl(state.user.id);
      avatarImg.alt = 'Avatar';
      avatarContainer.appendChild(avatarImg);
    } else {
      avatarContainer.textContent = state.user.name.charAt(0).toUpperCase();
    }
    
    const userName = document.createElement('span');
    userName.textContent = state.user.name;
    
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Salir';
    logoutBtn.onclick = async () => {
      try { await API.logout(state.token); } catch (e) { /* ignore */ }
      clearAuth();
      state.currentBoard = null;
      showView('auth-view');
    };
    
    userContainer.appendChild(avatarContainer);
    userContainer.appendChild(userName);
    container.appendChild(userContainer);
    container.appendChild(logoutBtn);
  }
}

function setupAuthForms() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`${t.dataset.tab}-form`).classList.add('active');
  }));

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    try {
      const { token, user } = await API.login(data);
      setAuth(token, user);
      await loadBoards();
      showView('boards-view');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';
    try {
      const { token, user } = await API.register(data);
      setAuth(token, user);
      await loadBoards();
      showView('boards-view');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

async function loadBoards() {
  const boards = await API.boards(state.token);
  state.boards = boards;
  renderBoards();
}

function renderBoards() {
  const list = document.getElementById('boards-list');
  list.innerHTML = '';
  state.boards.forEach(b => {
    const item = document.createElement('div');
    item.className = 'board-item';
    item.textContent = b.name;
    item.onclick = async () => {
      const full = await API.getBoard(state.token, b.id);
      state.currentBoard = full;
      state.members = await API.getBoardMembers(state.token, b.id);
      renderBoard();
      showView('board-view');
    };
    list.appendChild(item);
  });
}

function setupBoardsView() {
  document.getElementById('create-board-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const board = await API.createBoard(state.token, { name: data.name });
    // Initialize lists and members arrays for new boards
    board.lists = [];
    board.members = [];
    state.boards.push(board);
    renderBoards();
    e.target.reset();
  });
}

function setupBoardView() {
  document.getElementById('back-to-boards').addEventListener('click', async () => {
    await loadBoards();
    showView('boards-view');
  });

  document.getElementById('invite-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get('email');
    if (!email) return;
    try {
      await API.invite(state.token, state.currentBoard.id, email);
      const full = await API.getBoard(state.token, state.currentBoard.id);
      state.currentBoard = full;
      renderBoard();
      e.target.reset();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('add-list-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = new FormData(e.target).get('title');
    if (!title) return;
    const list = await API.addList(state.token, state.currentBoard.id, title);
    // Initialize cards array for new lists
    list.cards = [];
    state.currentBoard.lists.push(list);
    renderBoard();
    e.target.reset();
    // Keep focus on the add list input after rendering
    setTimeout(() => {
      const input = document.querySelector('#add-list-form input');
      if (input) input.focus();
    }, 0);
  });
}

function renderBoard() {
  document.getElementById('board-title').textContent = state.currentBoard.name;
  const listsEl = document.getElementById('lists');
  listsEl.innerHTML = '';

  const listTpl = document.getElementById('list-template');
  const cardTpl = document.getElementById('card-template');

  state.currentBoard.lists.sort((a,b) => a.position - b.position).forEach(list => {
    const node = listTpl.content.cloneNode(true);
    const listEl = node.querySelector('.list');
    const titleInput = node.querySelector('.list-title');
    const cardsContainer = node.querySelector('.cards');
    const delBtn = node.querySelector('.delete-list');

    // Apply custom color class
    listEl.classList.add('color-custom');

    titleInput.value = list.title;
    titleInput.addEventListener('change', async () => {
      try {
        await API.updateList(state.token, state.currentBoard.id, list.id, { title: titleInput.value });
      } catch (err) { showToast('Error al actualizar el título de la lista: ' + err.message, 'error'); }
    });

    delBtn.addEventListener('click', async () => {
      if (!confirm('Eliminar lista?')) return;
      try {
        await API.deleteList(state.token, state.currentBoard.id, list.id);
        state.currentBoard.lists = state.currentBoard.lists.filter(l => l.id !== list.id);
        renderBoard();
      } catch (err) { showToast('Error al eliminar la lista: ' + err.message, 'error'); }
    });

    cardsContainer.dataset.listId = list.id;
    listEl.dataset.listId = list.id;
    enableDrop(cardsContainer);

    list.cards.sort((a,b) => a.position - b.position).forEach(card => {
      const cnode = cardTpl.content.cloneNode(true);
      const cardEl = cnode.querySelector('.card');
      const creatorEl = cnode.querySelector('.card-creator');
      const statusEl = cnode.querySelector('.card-status');
      const assigneesEl = cnode.querySelector('.card-assignees');
      const titleEl = cnode.querySelector('.card-title');
      const descEl = cnode.querySelector('.card-desc');
      const saveBtn = cnode.querySelector('.save-card');
      const delBtn = cnode.querySelector('.delete-card');

      cardEl.dataset.cardId = card.id;
      cardEl.classList.add(`status-${card.status || 'todo'}`);
      titleEl.textContent = card.title;

      // Auto-save title on change
      let titleSaveTimeout;
      titleEl.addEventListener('input', () => {
        clearTimeout(titleSaveTimeout);
        titleSaveTimeout = setTimeout(async () => {
          try {
            await API.updateCard(state.token, state.currentBoard.id, list.id, card.id, {
              title: titleEl.textContent,
            });
            card.title = titleEl.textContent;
          } catch (err) {
            console.error('Error auto-saving title:', err);
          }
        }, 1000); // Save after 1 second of no typing
      });
      descEl.value = card.description || '';

      // Auto-save description on change
      let saveTimeout;
      descEl.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          try {
            await API.updateCard(state.token, state.currentBoard.id, list.id, card.id, {
              description: descEl.value,
            });
            card.description = descEl.value;
          } catch (err) {
            console.error('Error auto-saving description:', err);
          }
        }, 1000); // Save after 1 second of no typing
      });

      const creator = state.members.find(m => m.id === card.creatorId);
      if (creator) {
        creatorEl.textContent = creator.name.split(' ').map(n => n[0]).join('').toUpperCase();
      }

      statusEl.textContent = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' }[card.status || 'todo'];
      statusEl.onclick = () => {
        const nextStatus = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' }[card.status || 'todo'];
        API.updateCard(state.token, state.currentBoard.id, list.id, card.id, { status: nextStatus }).then(updated => {
          card.status = updated.status;
          cardEl.classList.remove('status-todo', 'status-in-progress', 'status-done');
          cardEl.classList.add(`status-${card.status}`);
          statusEl.textContent = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' }[card.status];
        }).catch(err => showToast('Error al cambiar el estado: ' + err.message, 'error'));
      };

      assigneesEl.innerHTML = '<span class="assign-icon">+</span>';
      card.assignees.forEach(aid => {
        const assignee = state.members.find(m => m.id === aid);
        if (assignee) {
          const span = document.createElement('span');
          span.className = 'assignee-initial';
          span.textContent = assignee.name.split(' ').map(n => n[0]).join('').toUpperCase();
          assigneesEl.appendChild(span);
        }
      });

      const dropdownEl = cnode.querySelector('.assignee-dropdown');
      const listEl = cnode.querySelector('.assignee-list');
      listEl.innerHTML = '';
      state.members.forEach(member => {
        const item = document.createElement('div');
        item.className = 'assignee-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = card.assignees.includes(member.id);
        checkbox.onchange = async () => {
          try {
            if (checkbox.checked) {
              await API.assignCard(state.token, state.currentBoard.id, list.id, card.id, member.id);
              card.assignees.push(member.id);
            } else {
              await API.unassignCard(state.token, state.currentBoard.id, list.id, card.id, member.id);
              card.assignees = card.assignees.filter(id => id !== member.id);
            }
            // Re-render assignees
            assigneesEl.innerHTML = '<span class="assign-icon">+</span>';
            card.assignees.forEach(aid => {
              const assignee = state.members.find(m => m.id === aid);
              if (assignee) {
                const span = document.createElement('span');
                span.className = 'assignee-initial';
                span.textContent = assignee.name.split(' ').map(n => n[0]).join('').toUpperCase();
                assigneesEl.appendChild(span);
              }
            });
          } catch (err) { showToast('Error al asignar usuario: ' + err.message, 'error'); }
        };
        item.appendChild(checkbox);
        item.appendChild(document.createTextNode(' ' + member.name));
        listEl.appendChild(item);
      });

      assigneesEl.onclick = (e) => {
        e.stopPropagation();
        dropdownEl.classList.toggle('hidden');
      };

      enableDrag(cardEl);

      saveBtn.addEventListener('click', async () => {
        try {
          await API.updateCard(state.token, state.currentBoard.id, list.id, card.id, {
            title: titleEl.textContent,
            description: descEl.value,
          });
        } catch (err) { showToast('Error al guardar la tarjeta: ' + err.message, 'error'); }
      });

      delBtn.addEventListener('click', async () => {
        if (!confirm('Eliminar tarjeta?')) return;
        try {
          await API.deleteCard(state.token, state.currentBoard.id, list.id, card.id);
          list.cards = list.cards.filter(c => c.id !== card.id);
          renderBoard();
        } catch (err) { showToast('Error al eliminar la tarjeta: ' + err.message, 'error'); }
      });

      cardsContainer.appendChild(cnode);
    });

    const addCardForm = node.querySelector('.add-card-form');
    addCardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = new FormData(e.target).get('title');
      if (!title) return;
      const newCard = await API.addCard(state.token, state.currentBoard.id, list.id, { title, description: '' });
      list.cards.push(newCard);
      renderBoard();
      e.target.reset();
      // Keep focus on the add card input after rendering
      setTimeout(() => {
        const listEl = document.querySelector(`.cards[data-list-id="${list.id}"]`);
        if (listEl) {
          const input = listEl.closest('.list').querySelector('.add-card-form input');
          if (input) input.focus();
        }
      }, 0);
    });

    listsEl.appendChild(node);
  });
}

function enableDrag(el) {
  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', el.dataset.cardId);
    e.dataTransfer.setData('fromListId', el.closest('.list').dataset.listId);
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
  });
}

function enableDrop(container) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.classList.add('drag-over');
    const afterElement = getDragAfterElement(container, e.clientY);
    const dragging = document.querySelector('.card.dragging');
    if (!dragging) return;
    if (afterElement == null) {
      container.appendChild(dragging);
    } else {
      container.insertBefore(dragging, afterElement);
    }
  });
  container.addEventListener('dragleave', () => {
    container.classList.remove('drag-over');
  });
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    container.classList.remove('drag-over');
    const cardId = e.dataTransfer.getData('text/plain');
    const fromListId = e.dataTransfer.getData('fromListId');
    const toListEl = container.closest('.list');

    // Calculate the correct drop position based on mouse position
    const afterElement = getDragAfterElement(container, e.clientY);
    const toIndex = afterElement ? Array.from(container.children).indexOf(afterElement) : container.children.length;

    const toListId = toListEl?.dataset.listId;

    document.querySelector('.card.dragging')?.classList.remove('dragging');

    if (!fromListId || !toListId) return;
    try {
      await API.moveCard(state.token, state.currentBoard.id, { cardId, fromListId, toListId, toIndex });
      const fresh = await API.getBoard(state.token, state.currentBoard.id);
      state.currentBoard = fresh;
      renderBoard();
    } catch (err) { showToast('Error al mover la tarjeta: ' + err.message, 'error'); }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function boot() {
  // Aplicar tema guardado
  applyTheme();
  
  // Aplicar personalización del tablero
  applyBoardCustomization();
  
  // Configurar toggle del tema
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Configurar panel de personalización
  setupCustomizationPanel();

  // Configurar panel de perfil
  setupProfilePanel();

  renderTopActions();
  setupAuthForms();
  setupBoardsView();
  setupBoardView();

  if (state.token) {
    try {
      await API.me(state.token);
      await loadBoards();
      showView('boards-view');
    } catch (err) {
      clearAuth();
      showView('auth-view');
    }
  } else {
    showView('auth-view');
  }
}

boot();
