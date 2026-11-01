#!/bin/bash

# ============================================
# BarberShop Deployment Script for Ubuntu VPS
# ============================================
# Usage: chmod +x deploy.sh && sudo ./deploy.sh [domain]
# ============================================

set -e

echo "🚀 BarberShop Deployment Script"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/barbershop"
DOMAIN="${1:-localhost}"
NODE_VERSION="20"
SERVER_PORT=3001

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# Detect source directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

echo -e "${YELLOW}[2/8] Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y -qq nodejs
    echo -e "${GREEN}Node.js installed: $(node --version)${NC}"
else
    echo -e "${GREEN}Node.js already installed: $(node --version)${NC}"
fi

# Verify npm is available
if ! command -v npm &> /dev/null; then
    apt-get install -y -qq npm
fi

echo -e "${YELLOW}[3/8] Installing Nginx...${NC}"
apt-get install -y -qq nginx
systemctl enable nginx

echo -e "${YELLOW}[4/8] Installing PM2 process manager...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo -e "${GREEN}PM2 already installed${NC}"
fi

echo -e "${YELLOW}[5/8] Setting up application directory...${NC}"
mkdir -p $APP_DIR

# Copy project files properly
echo "Copying project files to $APP_DIR..."

# Copy frontend source and config
cp -r "$SCRIPT_DIR/src" "$APP_DIR/"
cp -r "$SCRIPT_DIR/public" "$APP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/package.json" "$APP_DIR/"
cp "$SCRIPT_DIR/package-lock.json" "$APP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/tsconfig.json" "$APP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/vite.config.js" "$APP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/vite.config.ts" "$APP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/index.html" "$APP_DIR/"

# Copy server
mkdir -p "$APP_DIR/server"
cp -r "$SCRIPT_DIR/server/"* "$APP_DIR/server/"

echo -e "${GREEN}Files copied successfully${NC}"

cd $APP_DIR

echo -e "${YELLOW}[6/8] Building frontend...${NC}"
npm install --production=false
npm run build

if [ ! -d "$APP_DIR/dist" ]; then
    echo -e "${RED}Error: Frontend build failed - dist directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend built successfully${NC}"

echo -e "${YELLOW}[7/8] Installing server dependencies...${NC}"
cd $APP_DIR/server
npm install --production

# Create .env file if not exists
if [ ! -f "$APP_DIR/server/.env" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    cat > "$APP_DIR/server/.env" << EOF
PORT=$SERVER_PORT
JWT_SECRET=$JWT_SECRET
EOF
    echo -e "${GREEN}Created .env with random JWT secret${NC}"
fi

echo -e "${YELLOW}[8/8] Configuring Nginx and starting server...${NC}"

# Create Nginx config
cat > /etc/nginx/sites-available/barbershop << NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /assets {
        proxy_pass http://127.0.0.1:$SERVER_PORT;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
NGINX_CONF

# Enable site
ln -sf /etc/nginx/sites-available/barbershop /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl restart nginx

# Stop existing PM2 instance
pm2 delete barbershop 2>/dev/null || true

# Start server with PM2
cd $APP_DIR/server
pm2 start index.js --name barbershop --env production
pm2 save

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if server is running
if pm2 status barbershop | grep -q "online"; then
    echo -e "${GREEN}Server is running!${NC}"
else
    echo -e "${RED}Server failed to start. Logs:${NC}"
    pm2 logs barbershop --lines 20 --nostream
    exit 1
fi

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 save

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "📍 Application URL: ${GREEN}http://$DOMAIN${NC}"
echo -e "🔧 Admin Panel:     ${GREEN}http://$DOMAIN/admin${NC}"
echo -e "👤 Default login:   ${YELLOW}admin${NC}"
echo -e "🔑 Default password:${YELLOW} admin123${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change the default password after first login!${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  ${GREEN}pm2 logs barbershop${NC}     - View logs"
echo -e "  ${GREEN}pm2 restart barbershop${NC}  - Restart server"
echo -e "  ${GREEN}pm2 status${NC}              - Check status"
echo -e "  ${GREEN}systemctl status nginx${NC}  - Check Nginx"
echo ""
echo -e "To setup SSL (HTTPS) with Let's Encrypt:"
echo -e "  ${GREEN}apt install certbot python3-certbot-nginx${NC}"
echo -e "  ${GREEN}certbot --nginx -d $DOMAIN${NC}"
echo ""
