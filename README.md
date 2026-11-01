# 💈 BarberShop - Сайт барбершопа с админ-панелью

Полноценный сайт барбершопа с системой онлайн-записи, админ-панелью и интеграцией с Telegram.

## 📋 Возможности

### Клиентская часть (сайт):
- 🏠 Главная страница с описанием барбершопа
- 💈 Каталог услуг с ценами
- 📅 Онлайн-запись на услуги (выбор услуги → дата/время → контакты)
- 🎨 5 тем оформления (классическая, модерн, тёмная, золотая, минимализм)

### Админ-панель:
- 🔐 Авторизация (по умолчанию: admin / admin123)
- 📊 Расписание с недельным видом записей
- 👥 Управление записями клиентов (статусы: ожидает, подтверждена, завершена, отменена)
- ✏️ Редактирование услуг и цен
- ⚙️ Настройки барбершопа (название, адрес, телефон, режим работы)
- 🤖 Настройка Telegram-бота для уведомлений о новых записях
- 🎨 Выбор темы оформления сайта
- ➕ Ручное создание записей

### Серверная часть:
- 🗄️ SQLite база данных (не требует отдельной установки)
- 🔑 JWT авторизация
- 📡 REST API
- 🤖 Автоматические уведомления в Telegram

---

## 🚀 Развёртывание на VPS (Ubuntu)

### Быстрое развёртывание (один скрипт):

```bash
# 1. Загрузите проект на сервер (scp, git clone и т.д.)
scp -r ./* user@your-server:/tmp/barbershop/

# 2. Подключитесь к серверу
ssh user@your-server

# 3. Запустите скрипт развёртывания
cd /tmp/barbershop
sudo bash deploy.sh your-domain.com
```

Скрипт автоматически:
- Установит Node.js 20
- Установит Nginx
- Установит PM2 (менеджер процессов)
- Соберёт фронтенд
- Установит зависимости сервера
- Настроит Nginx как reverse proxy
- Запустит приложение через PM2

### Ручное развёртывание:

```bash
# 1. Установите Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 2. Установите зависимости фронтенда и соберите
npm install
npm run build

# 3. Установите зависимости сервера
cd server
npm install

# 4. Запустите сервер
node index.js
# Сервер будет доступен на http://localhost:3001
```

### Настройка Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Настройка SSL (HTTPS):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 Решение ошибки 502 Bad Gateway

Ошибка 502 означает, что Nginx не может подключиться к backend-серверу.

### Быстрая диагностика

Запустите скрипт диагностики:
```bash
sudo bash diagnose.sh
```

### Пошаговая проверка

**1. Проверьте, запущен ли сервер:**
```bash
pm2 status
pm2 logs barbershop --lines 30
```

**2. Проверьте, слушает ли сервер порт 3001:**
```bash
ss -tlnp | grep 3001
# или
curl http://localhost:3001/api/health
```

**3. Проверьте Nginx:**
```bash
systemctl status nginx
nginx -t
```

**4. Проверьте логи Nginx:**
```bash
tail -50 /var/log/nginx/error.log
```

### Частые причины и решения

| Проблема | Решение |
|----------|---------|
| Сервер не запущен | `pm2 start /opt/barbershop/server/index.js --name barbershop` |
| Сервер упал с ошибкой | `pm2 logs barbershop` — посмотрите ошибку |
| Порт 3001 занят | `lsof -i :3001` — найдите процесс, `kill -9 <PID>` |
| Nginx не запущен | `systemctl start nginx` |
| Неправильный порт в Nginx | Проверьте `/etc/nginx/sites-available/barbershop` |
| Frontend не собран | `cd /opt/barbershop && npm run build` |
| Нет файла dist/index.html | Пересоберите фронтенд |

### Полный переразвёртывание

```bash
# Остановить всё
pm2 delete barbershop
systemctl stop nginx

# Пересобрать
cd /opt/barbershop
npm run build

# Запустить сервер
cd server
pm2 start index.js --name barbershop

# Запустить Nginx
systemctl start nginx

# Проверить
curl http://localhost:3001/api/health
curl http://localhost/api/health
```

---

## 🔧 Настройка Telegram бота

1. Откройте Telegram и найдите @BotFather
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте полученный токен бота
4. Добавьте бота в чат/группу куда будут приходить уведомления
5. Отправьте любое сообщение в этот чат
6. Откройте в браузере: `https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates`
7. Найдите `chat.id` в ответе
8. Введите токен и chat_id в админ-панели
9. Нажмите "Тест" для проверки

---

## 📁 Структура проекта

```
├── src/                    # Фронтенд (React + Vite + Tailwind)
│   ├── App.tsx            # Роутер и основная разметка
│   ├── types.ts           # TypeScript типы
│   ├── pages/
│   │   ├── HomePage.tsx   # Главная страница
│   │   ├── BookingPage.tsx # Страница записи
│   │   ├── AdminLogin.tsx # Авторизация админа
│   │   └── AdminDashboard.tsx # Админ-панель
│   └── api/
│       ├── store.ts       # Локальное хранилище (localStorage)
│       └── client.ts      # API клиент для сервера
├── server/                # Бэкенд (Express + SQLite)
│   ├── index.js          # API сервер
│   └── package.json      # Зависимости сервера
├── deploy.sh             # Скрипт развёртывания
├── diagnose.sh           # Скрипт диагностики
└── README.md
```

---

## 🔐 Безопасность

⚠️ **Обязательно измените пароль администратора после первого входа!**

Для изменения пароля подключитесь к базе данных:
```bash
cd /opt/barbershop/server
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('barbershop.db');
const newHash = bcrypt.hashSync('YOUR_NEW_PASSWORD', 10);
db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newHash, 'admin');
console.log('Password updated!');
"
```

Также рекомендуется изменить `JWT_SECRET` в файле `server/.env`.

---

## 🛠 Технологии

- **Фронтенд:** React 18, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide Icons
- **Бэкенд:** Node.js, Express, better-sqlite3, JWT, bcrypt
- **Развёртывание:** Nginx, PM2, Ubuntu

---

## 📝 Лицензия

MIT
