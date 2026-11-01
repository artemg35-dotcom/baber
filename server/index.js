import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually (simple parser)
import { readFileSync } from 'fs';
try {
  const envPath = join(__dirname, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
} catch (e) {
  console.log('No .env file found, using defaults');
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'barbershop-secret-key-change-in-production';

// Resolve paths
const SERVER_DIR = __dirname;
const PROJECT_ROOT = resolve(SERVER_DIR, '..');
const DIST_DIR = resolve(PROJECT_ROOT, 'dist');

console.log('📁 Server directory:', SERVER_DIR);
console.log('📁 Project root:', PROJECT_ROOT);
console.log('📁 Dist directory:', DIST_DIR);
console.log('📁 Dist exists:', existsSync(DIST_DIR));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    maxAge: '1d',
    etag: true,
  }));
  console.log('✅ Static files will be served from:', DIST_DIR);
} else {
  console.warn('⚠️  Dist directory not found at:', DIST_DIR);
  console.warn('   Frontend will not be served. Make sure to run "npm run build" first.');
}

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Database setup
const DB_PATH = join(SERVER_DIR, 'barbershop.db');
console.log('📁 Database path:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

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

console.log('✅ Database initialized');

// Seed default admin user
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hashedPassword);
  console.log('✅ Default admin user created (admin / admin123)');
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
  console.log('✅ Default services created');
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
    description: 'Премиальный барбершоп в центре города. Опытные мастера, качественные инструменты, атмосфера настоящего мужского клуба.',
    theme: 'classic',
  };
  const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
  console.log('✅ Default settings created');
}

// Seed telegram config
const tgExists = db.prepare('SELECT id FROM telegram_config WHERE id = 1').get();
if (!tgExists) {
  db.prepare('INSERT INTO telegram_config (id, enabled, bot_token, chat_id) VALUES (1, 0, "", "")').run();
}

// ===== HEALTHCHECK =====
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    distExists: existsSync(DIST_DIR)
  });
});

// ===== AUTH ROUTES =====
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ username: decoded.username });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== SERVICES ROUTES =====
app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY sort_order, name').all();
    res.json(services.map(s => ({ ...s, active: !!s.active })));
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/services', authMiddleware, (req, res) => {
  try {
    const { name, price, duration, description } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price required' });
    }
    const id = Date.now().toString();
    db.prepare('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, price, duration || 30, description || '');
    res.json({ id, name, price, duration: duration || 30, description, active: true });
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/services/:id', authMiddleware, (req, res) => {
  try {
    const { name, price, duration, description, active } = req.body;
    db.prepare('UPDATE services SET name=?, price=?, duration=?, description=?, active=? WHERE id=?')
      .run(name, price, duration, description || '', active ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Update service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/services/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM services WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== APPOINTMENTS ROUTES =====
app.get('/api/appointments', (req, res) => {
  try {
    const appointments = db.prepare('SELECT * FROM appointments ORDER BY date DESC, time DESC').all();
    res.json(appointments.map(a => ({
      id: a.id,
      clientName: a.client_name,
      clientPhone: a.client_phone,
      serviceId: a.service_id,
      serviceName: a.service_name,
      date: a.date,
      time: a.time,
      status: a.status,
      notes: a.notes,
      createdAt: a.created_at,
    })));
  } catch (err) {
    console.error('Get appointments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments', (req, res) => {
  try {
    const { clientName, clientPhone, serviceId, serviceName, date, time, notes } = req.body;
    if (!clientName || !serviceName || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO appointments (id, client_name, client_phone, service_id, service_name, date, time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, clientName, clientPhone || '', serviceId || '', serviceName, date, time, notes || '', createdAt);
    
    // Send telegram notification (async, don't block response)
    sendTelegramNotification({ clientName, clientPhone, serviceName, date, time, notes }).catch(console.error);
    
    res.json({ id, clientName, clientPhone, serviceId, serviceName, date, time, status: 'pending', notes, createdAt });
  } catch (err) {
    console.error('Create appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/appointments/:id', authMiddleware, (req, res) => {
  try {
    const { status, clientName, clientPhone, serviceName, date, time, notes } = req.body;
    db.prepare('UPDATE appointments SET status=?, client_name=?, client_phone=?, service_name=?, date=?, time=?, notes=? WHERE id=?')
      .run(status || 'pending', clientName || '', clientPhone || '', serviceName || '', date || '', time || '', notes || '', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Update appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/appointments/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== SETTINGS ROUTES =====
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/settings', authMiddleware, (req, res) => {
  try {
    const updates = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, String(value));
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TELEGRAM ROUTES =====
app.get('/api/telegram', authMiddleware, (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM telegram_config WHERE id = 1').get();
    res.json({ enabled: !!config?.enabled, botToken: config?.bot_token || '', chatId: config?.chat_id || '' });
  } catch (err) {
    console.error('Get telegram error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/telegram', authMiddleware, (req, res) => {
  try {
    const { enabled, botToken, chatId } = req.body;
    db.prepare('UPDATE telegram_config SET enabled=?, bot_token=?, chat_id=? WHERE id=1')
      .run(enabled ? 1 : 0, botToken || '', chatId || '');
    res.json({ success: true });
  } catch (err) {
    console.error('Update telegram error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HTTP helper (compatible with all Node.js versions)
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;
      
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000,
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data)),
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

app.post('/api/telegram/test', authMiddleware, async (req, res) => {
  try {
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) {
      return res.status(400).json({ error: 'Bot token and chat ID required' });
    }
    const response = await httpRequest(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
      const data = await response.json().catch(() => ({}));
      res.status(400).json({ error: 'Failed to send', details: data });
    }
  } catch (err) {
    console.error('Telegram test error:', err);
    res.status(500).json({ error: 'Connection error: ' + err.message });
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

    await httpRequest(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
      }),
    });
    console.log('✅ Telegram notification sent');
  } catch (err) {
    console.error('Telegram notification error:', err.message);
  }
}

// ===== SPA FALLBACK =====
// Serve index.html for all non-API routes (for React Router)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>BarberShop</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>💈 BarberShop Server Running</h1>
          <p>Server is running on port ${PORT}</p>
          <p style="color: #999;">Frontend not built. Run <code>npm run build</code> in project root.</p>
          <p><a href="/api/health">API Health Check</a></p>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 ==========================================');
  console.log(`🚀 BarberShop server running on port ${PORT}`);
  console.log(`🚀 http://localhost:${PORT}`);
  console.log('🚀 ==========================================');
  console.log('');
  console.log('📋 Available routes:');
  console.log('   GET  /api/health          - Health check');
  console.log('   GET  /api/settings        - Get settings');
  console.log('   GET  /api/services        - Get services');
  console.log('   GET  /api/appointments    - Get appointments');
  console.log('   POST /api/auth/login      - Admin login');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  db.close();
  process.exit(0);
});
