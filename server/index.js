import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'barbershop-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// Database setup
const db = new Database(join(__dirname, 'barbershop.db'));
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    description TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT DEFAULT '',
    service_id TEXT,
    service_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS telegram_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER DEFAULT 0,
    bot_token TEXT DEFAULT '',
    chat_id TEXT DEFAULT ''
  );
`);

// Seed default admin user
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hashedPassword);
}

// Seed default services
const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get();
if (servicesCount.count === 0) {
  const defaultServices = [
    { id: '1', name: 'Мужская стрижка', price: 1500, duration: 45, description: 'Классическая или модельная стрижка' },
    { id: '2', name: 'Стрижка бороды', price: 800, duration: 30, description: 'Оформление и стрижка бороды' },
    { id: '3', name: 'Стрижка + Борода', price: 2000, duration: 60, description: 'Комплекс: стрижка и оформление бороды' },
    { id: '4', name: 'Королевское бритьё', price: 1200, duration: 40, description: 'Бритьё опасной бритвой с горячим полотенцем' },
    { id: '5', name: 'Детская стрижка', price: 1000, duration: 30, description: 'Стрижка для детей до 12 лет' },
    { id: '6', name: 'Камуфляж седины', price: 1500, duration: 45, description: 'Камуфляж седых волос и бороды' },
  ];
  const insert = db.prepare('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)');
  for (const s of defaultServices) {
    insert.run(s.id, s.name, s.price, s.duration, s.description);
  }
}

// Seed default settings
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsCount.count === 0) {
  const defaults = {
    shopName: 'BARBER PRO',
    address: 'ул. Пушкина, д. 10',
    phone: '+7 (999) 123-45-67',
    email: 'info@barberpro.ru',
    workSchedule: 'Пн-Сб: 10:00 - 21:00, Вс: 11:00 - 19:00',
    description: 'Премиальный барбершоп в центре города.',
    theme: 'classic',
  };
  const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
}

// Seed telegram config
const tgExists = db.prepare('SELECT id FROM telegram_config WHERE id = 1').get();
if (!tgExists) {
  db.prepare('INSERT INTO telegram_config (id, enabled, bot_token, chat_id) VALUES (1, 0, "", "")').run();
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== AUTH ROUTES =====
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ username: req.user?.username || 'admin' });
});

// ===== SERVICES ROUTES =====
app.get('/api/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services ORDER BY sort_order, name').all();
  res.json(services.map(s => ({ ...s, active: !!s.active })));
});

app.post('/api/services', authMiddleware, (req, res) => {
  const { name, price, duration, description } = req.body;
  const id = Date.now().toString();
  db.prepare('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, price, duration, description || '');
  res.json({ id, name, price, duration, description, active: true });
});

app.put('/api/services/:id', authMiddleware, (req, res) => {
  const { name, price, duration, description, active } = req.body;
  db.prepare('UPDATE services SET name=?, price=?, duration=?, description=?, active=? WHERE id=?')
    .run(name, price, duration, description || '', active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/services/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM services WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ===== APPOINTMENTS ROUTES =====
app.get('/api/appointments', (req, res) => {
  const appointments = db.prepare('SELECT * FROM appointments ORDER BY date DESC, time DESC').all();
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const { clientName, clientPhone, serviceId, serviceName, date, time, notes } = req.body;
  const id = Date.now().toString();
  db.prepare('INSERT INTO appointments (id, client_name, client_phone, service_id, service_name, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, clientName, clientPhone || '', serviceId, serviceName, date, time, notes || '');
  
  // Send telegram notification
  sendTelegramNotification({ clientName, clientPhone, serviceName, date, time, notes });
  
  res.json({ id, clientName, clientPhone, serviceId, serviceName, date, time, status: 'pending', notes, createdAt: new Date().toISOString() });
});

app.put('/api/appointments/:id', authMiddleware, (req, res) => {
  const { status, clientName, clientPhone, serviceName, date, time, notes } = req.body;
  db.prepare('UPDATE appointments SET status=?, client_name=?, client_phone=?, service_name=?, date=?, time=?, notes=? WHERE id=?')
    .run(status || 'pending', clientName, clientPhone || '', serviceName, date, time, notes || '', req.params.id);
  res.json({ success: true });
});

app.delete('/api/appointments/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ===== SETTINGS ROUTES =====
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

app.put('/api/settings', authMiddleware, (req, res) => {
  const updates = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(updates)) {
    upsert.run(key, String(value));
  }
  res.json({ success: true });
});

// ===== TELEGRAM ROUTES =====
app.get('/api/telegram', authMiddleware, (req, res) => {
  const config = db.prepare('SELECT * FROM telegram_config WHERE id = 1').get();
  res.json({ enabled: !!config?.enabled, botToken: config?.bot_token || '', chatId: config?.chat_id || '' });
});

app.put('/api/telegram', authMiddleware, (req, res) => {
  const { enabled, botToken, chatId } = req.body;
  db.prepare('UPDATE telegram_config SET enabled=?, bot_token=?, chat_id=? WHERE id=1')
    .run(enabled ? 1 : 0, botToken || '', chatId || '');
  res.json({ success: true });
});

app.post('/api/telegram/test', authMiddleware, async (req, res) => {
  const { botToken, chatId } = req.body;
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ Тестовое сообщение от BarberShop Admin Panel',
      }),
    });
    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Failed to send message' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Connection error' });
  }
});

// Telegram notification helper
async function sendTelegramNotification(appointment) {
  try {
    const config = db.prepare('SELECT * FROM telegram_config WHERE id = 1').get();
    if (!config?.enabled || !config.bot_token || !config.chat_id) return;

    const message = `🆕 Новая запись!\n\n` +
      `👤 Клиент: ${appointment.clientName}\n` +
      `📱 Телефон: ${appointment.clientPhone || 'не указан'}\n` +
      `💈 Услуга: ${appointment.serviceName}\n` +
      `📅 Дата: ${appointment.date}\n` +
      `⏰ Время: ${appointment.time}\n` +
      (appointment.notes ? `📝 Заметки: ${appointment.notes}\n` : '');

    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
      }),
    });
  } catch (err) {
    console.error('Telegram notification error:', err);
  }
}

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 BarberShop server running on http://localhost:${PORT}`);
});
