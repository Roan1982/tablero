const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_change_me';

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Data storage paths
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const boardsFile = path.join(dataDir, 'boards.json');

// Token blacklist for logout (in-memory)
const tokenBlacklist = new Set();

async function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    await fsp.mkdir(dataDir, { recursive: true });
  }
  if (!fs.existsSync(usersFile)) {
    await fsp.writeFile(usersFile, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(boardsFile)) {
    await fsp.writeFile(boardsFile, JSON.stringify([], null, 2), 'utf8');
  }
}

async function readJson(filePath) {
  const content = await fsp.readFile(filePath, 'utf8');
  return JSON.parse(content || '[]');
}

async function writeJson(filePath, data) {
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function loadUsers() {
  return await readJson(usersFile);
}

async function saveUsers(users) {
  await writeJson(usersFile, users);
}

async function loadBoards() {
  return await readJson(boardsFile);
}

async function saveBoards(boards) {
  await writeJson(boardsFile, boards);
}

function createToken(user) {
  const payload = { sub: user.id, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const [, token] = authHeader.split(' ');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function isBoardMember(board, userId) {
  return board.ownerId === userId || (board.members || []).includes(userId);
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    await ensureDataFiles();
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const users = await loadUsers();
    const existing = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      name,
      email: String(email).toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await saveUsers(users);

    const token = createToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await ensureDataFiles();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await loadUsers();
    const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = createToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  tokenBlacklist.add(req.token);
  res.json({ success: true });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const users = await loadUsers();
    const me = users.find(u => u.id === req.userId);
    if (!me) return res.status(404).json({ error: 'User not found' });
    res.json({ id: me.id, name: me.name, email: me.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Boards
app.get('/api/boards', authMiddleware, async (req, res) => {
  try {
    const boards = await loadBoards();
    const myBoards = boards.filter(b => isBoardMember(b, req.userId));
    res.json(myBoards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/boards', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const boards = await loadBoards();
    const board = {
      id: uuidv4(),
      ownerId: req.userId,
      name,
      members: [],
      lists: [],
      createdAt: new Date().toISOString(),
    };
    boards.push(board);
    await saveBoards(boards);
    res.status(201).json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/boards/:boardId', authMiddleware, async (req, res) => {
  try {
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/boards/:boardId', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const boards = await loadBoards();
    const idx = boards.findIndex(b => b.id === req.params.boardId);
    if (idx === -1) return res.status(404).json({ error: 'Board not found' });
    const board = boards[idx];
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    if (typeof name === 'string' && name.trim()) board.name = name.trim();
    boards[idx] = board;
    await saveBoards(boards);
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boards/:boardId', authMiddleware, async (req, res) => {
  try {
    const boards = await loadBoards();
    const idx = boards.findIndex(b => b.id === req.params.boardId);
    if (idx === -1) return res.status(404).json({ error: 'Board not found' });
    const board = boards[idx];
    if (board.ownerId !== req.userId) return res.status(403).json({ error: 'Only owner can delete board' });
    boards.splice(idx, 1);
    await saveBoards(boards);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Board members
app.post('/api/boards/:boardId/members', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const boards = await loadBoards();
    const users = await loadUsers();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.ownerId !== req.userId) return res.status(403).json({ error: 'Only owner can add members' });
    const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!board.members.includes(user.id) && user.id !== board.ownerId) {
      board.members.push(user.id);
    }
    await saveBoards(boards);
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Lists
app.post('/api/boards/:boardId/lists', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const position = board.lists.length;
    const list = { id: uuidv4(), title, position, cards: [] };
    board.lists.push(list);
    await saveBoards(boards);
    res.status(201).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    if (typeof title === 'string') list.title = title;
    await saveBoards(boards);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
  try {
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const idx = board.lists.findIndex(l => l.id === req.params.listId);
    if (idx === -1) return res.status(404).json({ error: 'List not found' });
    board.lists.splice(idx, 1);
    // Recompute positions
    board.lists.forEach((l, i) => (l.position = i));
    await saveBoards(boards);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/boards/:boardId/lists/reorder', authMiddleware, async (req, res) => {
  try {
    const { listOrder } = req.body; // array of list IDs in new order
    if (!Array.isArray(listOrder)) return res.status(400).json({ error: 'listOrder must be an array' });
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });

    const listsById = Object.fromEntries(board.lists.map(l => [l.id, l]));
    const newLists = listOrder.map((id, idx) => ({ ...listsById[id], position: idx })).filter(Boolean);
    if (newLists.length !== board.lists.length) return res.status(400).json({ error: 'listOrder mismatch' });
    board.lists = newLists;
    await saveBoards(boards);
    res.json(board.lists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cards
app.post('/api/boards/:boardId/lists/:listId/cards', authMiddleware, async (req, res) => {
  try {
    const { title, description = '' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const position = list.cards.length;
    const card = { id: uuidv4(), title, description, position, createdAt: new Date().toISOString(), creatorId: req.userId, assignees: [], status: 'todo' };
    list.cards.push(card);
    await saveBoards(boards);
    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const card = list.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (typeof title === 'string') card.title = title;
    if (typeof description === 'string') card.description = description;
    if (['todo', 'in-progress', 'done'].includes(status)) card.status = status;
    await saveBoards(boards);
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, async (req, res) => {
  try {
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const idx = list.cards.findIndex(c => c.id === req.params.cardId);
    if (idx === -1) return res.status(404).json({ error: 'Card not found' });
    list.cards.splice(idx, 1);
    list.cards.forEach((c, i) => (c.position = i));
    await saveBoards(boards);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign user to card
app.post('/api/boards/:boardId/lists/:listId/cards/:cardId/assignees', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const card = list.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (!board.members.includes(userId) && board.ownerId !== userId) return res.status(400).json({ error: 'User not a member' });
    if (!card.assignees.includes(userId)) card.assignees.push(userId);
    await saveBoards(boards);
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unassign user from card
app.delete('/api/boards/:boardId/lists/:listId/cards/:cardId/assignees/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const card = list.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    card.assignees = card.assignees.filter(id => id !== userId);
    await saveBoards(boards);
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get board members
app.get('/api/boards/:boardId/members', authMiddleware, async (req, res) => {
  try {
    const boards = await loadBoards();
    const users = await loadUsers();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const members = [board.ownerId, ...board.members].map(id => users.find(u => u.id === id)).filter(Boolean);
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/boards/:boardId/cards/move', authMiddleware, async (req, res) => {
  try {
    const { cardId, fromListId, toListId, toIndex } = req.body;
    if (!cardId || !fromListId || !toListId || typeof toIndex !== 'number') {
      return res.status(400).json({ error: 'cardId, fromListId, toListId, toIndex are required' });
    }
    const boards = await loadBoards();
    const board = boards.find(b => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });

    const fromList = board.lists.find(l => l.id === fromListId);
    const toList = board.lists.find(l => l.id === toListId);
    if (!fromList || !toList) return res.status(404).json({ error: 'List not found' });

    const idx = fromList.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return res.status(404).json({ error: 'Card not found in source list' });

    const [card] = fromList.cards.splice(idx, 1);
    // Clamp toIndex
    const insertIndex = Math.max(0, Math.min(toIndex, toList.cards.length));
    toList.cards.splice(insertIndex, 0, card);

    // Reindex positions
    fromList.cards.forEach((c, i) => (c.position = i));
    toList.cards.forEach((c, i) => (c.position = i));

    await saveBoards(boards);
    res.json({ success: true, card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fallback to frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

ensureDataFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
});
