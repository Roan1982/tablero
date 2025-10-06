const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_change_me';
const tokenBlacklist = new Set();

// Database setup
const db = new sqlite3.Database('./data/tablero.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS board_members (
    boardId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (boardId, userId),
    FOREIGN KEY (boardId) REFERENCES boards (id),
    FOREIGN KEY (userId) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    boardId TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (boardId) REFERENCES boards (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    listId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    creatorId TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    FOREIGN KEY (listId) REFERENCES lists (id),
    FOREIGN KEY (creatorId) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS card_assignees (
    cardId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (cardId, userId),
    FOREIGN KEY (cardId) REFERENCES cards (id),
    FOREIGN KEY (userId) REFERENCES users (id)
  )`);
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// DB helper functions
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function getUserByEmail(email) {
  return await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

async function getUserById(id) {
  return await dbGet('SELECT * FROM users WHERE id = ?', [id]);
}

async function createUser(user) {
  await dbRun('INSERT INTO users (id, name, email, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?)', 
    [user.id, user.name, user.email, user.passwordHash, user.createdAt]);
}

async function getBoardsForUser(userId) {
  const boards = await dbAll(`
    SELECT b.* FROM boards b
    LEFT JOIN board_members bm ON b.id = bm.boardId
    WHERE b.ownerId = ? OR bm.userId = ?
  `, [userId, userId]);
  return boards;
}

async function getBoardById(boardId) {
  const board = await dbGet('SELECT * FROM boards WHERE id = ?', [boardId]);
  if (!board) return null;
  board.members = await dbAll('SELECT userId FROM board_members WHERE boardId = ?', [boardId]).then(rows => rows.map(r => r.userId));
  // Include owner in members array for consistency
  if (!board.members.includes(board.ownerId)) {
    board.members.unshift(board.ownerId);
  }
  board.lists = await dbAll('SELECT * FROM lists WHERE boardId = ? ORDER BY position', [boardId]);
  for (const list of board.lists) {
    list.cards = await dbAll('SELECT * FROM cards WHERE listId = ? ORDER BY position', [list.id]);
    for (const card of list.cards) {
      card.assignees = await dbAll('SELECT userId FROM card_assignees WHERE cardId = ?', [card.id]).then(rows => rows.map(r => r.userId));
    }
  }
  return board;
}

async function createBoard(board) {
  await dbRun('INSERT INTO boards (id, ownerId, name, createdAt) VALUES (?, ?, ?, ?)', 
    [board.id, board.ownerId, board.name, board.createdAt]);
}

async function updateBoard(boardId, name) {
  await dbRun('UPDATE boards SET name = ? WHERE id = ?', [name, boardId]);
}

async function deleteBoard(boardId) {
  await dbRun('DELETE FROM card_assignees WHERE cardId IN (SELECT id FROM cards WHERE listId IN (SELECT id FROM lists WHERE boardId = ?))', [boardId]);
  await dbRun('DELETE FROM cards WHERE listId IN (SELECT id FROM lists WHERE boardId = ?)', [boardId]);
  await dbRun('DELETE FROM lists WHERE boardId = ?', [boardId]);
  await dbRun('DELETE FROM board_members WHERE boardId = ?', [boardId]);
  await dbRun('DELETE FROM boards WHERE id = ?', [boardId]);
}

async function addBoardMember(boardId, userId) {
  await dbRun('INSERT OR IGNORE INTO board_members (boardId, userId) VALUES (?, ?)', [boardId, userId]);
}

async function getBoardMembers(boardId) {
  const owner = await dbGet('SELECT * FROM users WHERE id = (SELECT ownerId FROM boards WHERE id = ?)', [boardId]);
  const members = await dbAll(`
    SELECT u.* FROM users u
    JOIN board_members bm ON u.id = bm.userId
    WHERE bm.boardId = ?
  `, [boardId]);
  return [owner, ...members].filter(Boolean);
}

async function createList(list) {
  await dbRun('INSERT INTO lists (id, boardId, title, position) VALUES (?, ?, ?, ?)', 
    [list.id, list.boardId, list.title, list.position]);
}

async function updateList(listId, title) {
  await dbRun('UPDATE lists SET title = ? WHERE id = ?', [title, listId]);
}

async function deleteList(listId) {
  await dbRun('DELETE FROM card_assignees WHERE cardId IN (SELECT id FROM cards WHERE listId = ?)', [listId]);
  await dbRun('DELETE FROM cards WHERE listId = ?', [listId]);
  await dbRun('DELETE FROM lists WHERE id = ?', [listId]);
}

async function reorderLists(boardId, listOrder) {
  for (let i = 0; i < listOrder.length; i++) {
    await dbRun('UPDATE lists SET position = ? WHERE id = ? AND boardId = ?', [i, listOrder[i], boardId]);
  }
}

async function createCard(card) {
  await dbRun('INSERT INTO cards (id, listId, title, description, position, createdAt, creatorId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [card.id, card.listId, card.title, card.description, card.position, card.createdAt, card.creatorId, card.status]);
}

async function updateCard(cardId, updates) {
  const fields = [];
  const values = [];
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (fields.length === 0) return;
  values.push(cardId);
  await dbRun(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function deleteCard(cardId) {
  await dbRun('DELETE FROM card_assignees WHERE cardId = ?', [cardId]);
  await dbRun('DELETE FROM cards WHERE id = ?', [cardId]);
}

async function assignCard(cardId, userId) {
  await dbRun('INSERT OR IGNORE INTO card_assignees (cardId, userId) VALUES (?, ?)', [cardId, userId]);
}

async function unassignCard(cardId, userId) {
  await dbRun('DELETE FROM card_assignees WHERE cardId = ? AND userId = ?', [cardId, userId]);
}

async function moveCard(cardId, toListId, toIndex) {
  // Get current position
  const card = await dbGet('SELECT listId, position FROM cards WHERE id = ?', [cardId]);
  if (!card) return;

  // Remove from old list
  await dbRun('UPDATE cards SET position = position - 1 WHERE listId = ? AND position > ?', [card.listId, card.position]);

  // Insert into new list
  await dbRun('UPDATE cards SET position = position + 1 WHERE listId = ? AND position >= ?', [toListId, toIndex]);
  await dbRun('UPDATE cards SET listId = ?, position = ? WHERE id = ?', [toListId, toIndex, cardId]);
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
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await getUserByEmail(email);
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
    await createUser(user);

    const token = createToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
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
    const me = await getUserById(req.userId);
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
    const myBoards = await getBoardsForUser(req.userId);
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

    const board = {
      id: uuidv4(),
      ownerId: req.userId,
      name,
      createdAt: new Date().toISOString(),
    };
    await createBoard(board);
    res.status(201).json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/boards/:boardId', authMiddleware, async (req, res) => {
  try {
    const board = await getBoardById(req.params.boardId);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    if (typeof name === 'string' && name.trim()) {
      await updateBoard(req.params.boardId, name.trim());
      board.name = name.trim();
    }
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boards/:boardId', authMiddleware, async (req, res) => {
  try {
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.ownerId !== req.userId) return res.status(403).json({ error: 'Only owner can delete board' });
    await deleteBoard(req.params.boardId);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.ownerId !== req.userId) return res.status(403).json({ error: 'Only owner can add members' });
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await addBoardMember(req.params.boardId, user.id);
    board.members.push(user.id);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const position = board.lists.length;
    const list = { id: uuidv4(), title, position };
    await createList({ ...list, boardId: req.params.boardId });
    res.status(201).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    if (typeof title === 'string') {
      await updateList(req.params.listId, title);
      list.title = title;
    }
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
  try {
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    await deleteList(req.params.listId);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });

    const listsById = Object.fromEntries(board.lists.map(l => [l.id, l]));
    const newLists = listOrder.map((id, idx) => ({ ...listsById[id], position: idx })).filter(Boolean);
    if (newLists.length !== board.lists.length) return res.status(400).json({ error: 'listOrder mismatch' });
    await reorderLists(req.params.boardId, listOrder);
    res.json(newLists);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const position = list.cards.length;
    const card = { id: uuidv4(), title, description, position, createdAt: new Date().toISOString(), creatorId: req.userId, status: 'todo', assignees: [] };
    await createCard({ ...card, listId: req.params.listId });
    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const card = list.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    const updates = {};
    if (typeof title === 'string') updates.title = title;
    if (typeof description === 'string') updates.description = description;
    if (['todo', 'in-progress', 'done'].includes(status)) updates.status = status;
    await updateCard(req.params.cardId, updates);
    Object.assign(card, updates);
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, async (req, res) => {
  try {
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const card = list.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    await deleteCard(req.params.cardId);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const card = list.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (!board.members.includes(userId) && board.ownerId !== userId) return res.status(400).json({ error: 'User not a member' });
    await assignCard(req.params.cardId, userId);
    if (!card.assignees.includes(userId)) card.assignees.push(userId);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const list = board.lists.find(l => l.id === req.params.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const card = list.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    await unassignCard(req.params.cardId, userId);
    card.assignees = card.assignees.filter(id => id !== userId);
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get board members
app.get('/api/boards/:boardId/members', authMiddleware, async (req, res) => {
  try {
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const members = await getBoardMembers(req.params.boardId);
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
    const board = await getBoardById(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!isBoardMember(board, req.userId)) return res.status(403).json({ error: 'Forbidden' });

    const fromList = board.lists.find(l => l.id === fromListId);
    const toList = board.lists.find(l => l.id === toListId);
    if (!fromList || !toList) return res.status(404).json({ error: 'List not found' });

    const card = fromList.cards.find(c => c.id === cardId);
    if (!card) return res.status(404).json({ error: 'Card not found in source list' });

    await moveCard(cardId, toListId, toIndex);
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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
