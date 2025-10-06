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

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function renderTopActions() {
  const container = document.getElementById('top-actions');
  container.innerHTML = '';
  if (state.user) {
    const span = document.createElement('span');
    span.textContent = state.user.name;
    const btn = document.createElement('button');
    btn.textContent = 'Salir';
    btn.onclick = async () => {
      try { await API.logout(state.token); } catch (e) { /* ignore */ }
      clearAuth();
      state.currentBoard = null;
      showView('auth-view');
    };
    container.appendChild(span);
    container.appendChild(btn);
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
      alert(err.message);
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

    titleInput.value = list.title;
    titleInput.addEventListener('change', async () => {
      try {
        await API.updateList(state.token, state.currentBoard.id, list.id, { title: titleInput.value });
      } catch (err) { alert(err.message); }
    });

    delBtn.addEventListener('click', async () => {
      if (!confirm('Eliminar lista?')) return;
      try {
        await API.deleteList(state.token, state.currentBoard.id, list.id);
        state.currentBoard.lists = state.currentBoard.lists.filter(l => l.id !== list.id);
        renderBoard();
      } catch (err) { alert(err.message); }
    });

    cardsContainer.dataset.listId = list.id;
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
        }).catch(err => alert(err.message));
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
          } catch (err) { alert(err.message); }
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
        } catch (err) { alert(err.message); }
      });

      delBtn.addEventListener('click', async () => {
        if (!confirm('Eliminar tarjeta?')) return;
        try {
          await API.deleteCard(state.token, state.currentBoard.id, list.id, card.id);
          list.cards = list.cards.filter(c => c.id !== card.id);
          renderBoard();
        } catch (err) { alert(err.message); }
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
    const fromListEl = document.querySelector('.cards .card.dragging')?.closest('.cards');
    const toListEl = container;

    // Calculate the correct drop position based on mouse position
    const afterElement = getDragAfterElement(container, e.clientY);
    const toIndex = afterElement ? Array.from(container.children).indexOf(afterElement) : container.children.length;

    const fromListId = fromListEl?.dataset.listId;
    const toListId = toListEl.dataset.listId;

    document.querySelector('.card.dragging')?.classList.remove('dragging');

    if (!fromListId || !toListId) return;
    try {
      await API.moveCard(state.token, state.currentBoard.id, { cardId, fromListId, toListId, toIndex });
      const fresh = await API.getBoard(state.token, state.currentBoard.id);
      state.currentBoard = fresh;
      renderBoard();
    } catch (err) { alert(err.message); }
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
