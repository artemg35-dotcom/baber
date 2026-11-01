import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'barbershop-secret-key-2024';

const SERVER_DIR = __dirname;
const PROJECT_ROOT = resolve(SERVER_DIR, '..');
const DIST_DIR = resolve(PROJECT_ROOT, 'dist');

console.log('📁 Server:', SERVER_DIR);
console.log('📁 Dist:', DIST_DIR, 'exists:', existsSync(DIST_DIR));

app.use(cors());
app.use(express.json());

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

// Database
const DB_PATH = join(SERVER_DIR, 'barbershop.db');
console.log('📁 DB:', DB_PATH);

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  console.log('✅ DB connected');
} catch (e) {
  console.error('❌ DB error:', e.message);
  process.exit(1);
}

// Create tables
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
  console.log('✅ users');
} catch (e) { console.error('❌ users:', e.message); }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      description TEXT DEFAULT '',
      active INTEGER DEFAULT 1
    )
  `);
  console.log('✅ services');
} catch (e) { console.error('❌ services:', e.message); }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_phone TEXT DEFAULT '',
      service_id TEXT DEFAULT '',
      service_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ appointments');
} catch (e) { console.error('❌ appointments:', e.message); }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  console.log('✅ settings');
} catch (e) { console.error('❌ settings:', e.message); }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_config (
      id INTEGER PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      bot_token TEXT DEFAULT '',
      chat_id TEXT DEFAULT ''
    )
  `);
  console.log('✅ telegram_config');
} catch (e) { console.error('❌ telegram_config:', e.message); }

console.log('✅ Tables ready');

// Seed data with error handling
try {
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
    console.log('✅ Admin created');
  }
} catch (e) { console.error('❌ Seed admin:', e.message); }

try {
  const count = db.prepare('SELECT COUNT(*) as c FROM services').get();
  if (count.c === 0) {
    db.prepare('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)').run('1', 'Мужская стрижка', 1500, 45, 'Классическая стрижка');
    db.prepare('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)').run('2', 'Стрижка бороды', 800, 30, 'Оформление бороды');
    db.prepare('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)').run('3', 'Стрижка + Борода', 2000, 60, 'Комплекс');
    console.log('✅ Services seeded');
  }
} catch (e) { console.error('❌ Seed services:', e.message); }

try {
  const count = db.prepare('SELECT COUNT(*) as c FROM settings').get();
  if (count.c === 0) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('shopName', 'BARBER PRO');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('phone', '+7 (999) 123-45-67');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('theme', 'classic');
    console.log('✅ Settings seeded');
  }
} catch (e) { console.error('❌ Seed settings:', e.message); }

try {
  const count = db.prepare('SELECT COUNT(*) as c FROM telegram_config').get();
  if (count.c === 0) {
    db.prepare('INSERT INTO telegram_config (id, enabled, bot_token, chat_id) VALUES (1, 0, ?, ?)').run('', '');
    console.log('✅ Telegram config seeded');
  }
} catch (e) { console.error('❌ Seed telegram:', e.message); }

console.log('🚀 Setup complete!');

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const obj = {};
    rows.forEach(r => obj[r.key] = r.value);
    res.json(obj);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    Object.entries(req.body).forEach(([k, v]) => {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(k, String(v));
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services').all();
    res.json(services.map(s => ({ ...s, active: !!s.active })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/services', (req, res) => {
  try {
    const { name, price, duration, description } = req.body;
    const id = Date.now().toString();
    db.prepare('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)').run(id, name, price, duration || 30, description || '');
    res.json({ id, name, price, duration, description, active: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const { name, price, duration, description, active } = req.body;
    db.prepare('UPDATE services SET name=?, price=?, duration=?, description=?, active=? WHERE id=?').run(name, price, duration, description || '', active ? 1 : 0, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/services/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM services WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/appointments', (req, res) => {
  try {
    const appts = db.prepare('SELECT * FROM appointments ORDER BY date DESC, time DESC').all();
    res.json(appts.map(a => ({
      id: a.id,
      clientName: a.client_name,
      clientPhone: a.client_phone,
      serviceId: a.service_id,
      serviceName: a.service_name,
      date: a.date,
      time: a.time,
      status: a.status,
      notes: a.notes,
      createdAt: a.created_at
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/appointments', (req, res) => {
  try {
    const { clientName, clientPhone, serviceId, serviceName, date, time, notes } = req.body;
    const id = Date.now().toString();
    db.prepare('INSERT INTO appointments (id, client_name, client_phone, service_id, service_name, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, clientName, clientPhone || '', serviceId || '', serviceName, date, time, notes || '');
    res.json({ id, clientName, clientPhone, serviceId, serviceName, date, time, status: 'pending', notes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const { status, clientName, clientPhone, serviceName, date, time, notes } = req.body;
    db.prepare('UPDATE appointments SET status=?, client_name=?, client_phone=?, service_name=?, date=?, time=?, notes=? WHERE id=?').run(status || 'pending', clientName || '', clientPhone || '', serviceName || '', date || '', time || '', notes || '', req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/telegram', (req, res) => {
  try {
    const c = db.prepare('SELECT * FROM telegram_config WHERE id = 1').get();
    res.json({ enabled: !!c?.enabled, botToken: c?.bot_token || '', chatId: c?.chat_id || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/telegram', (req, res) => {
  try {
    const { enabled, botToken, chatId } = req.body;
    db.prepare('UPDATE telegram_config SET enabled=?, bot_token=?, chat_id=? WHERE id=1').run(enabled ? 1 : 0, botToken || '', chatId || '');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  const idx = join(DIST_DIR, 'index.html');
  if (existsSync(idx)) res.sendFile(idx);
  else res.send('<h1>BarberShop Running</h1>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
});
