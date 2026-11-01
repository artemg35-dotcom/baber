#!/bin/bash

# ============================================
# BarberShop Deployment Script for Ubuntu VPS
# ============================================
# Usage: chmod +x deploy.sh && ./deploy.sh
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

echo -e "${YELLOW}[2/7] Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y -qq nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

echo -e "${YELLOW}[3/7] Installing Nginx...${NC}"
apt-get install -y -qq nginx
systemctl enable nginx

echo -e "${YELLOW}[4/7] Installing PM2 process manager...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 already installed"
fi

echo -e "${YELLOW}[5/7] Setting up application...${NC}"
mkdir -p $APP_DIR

# Copy project files
echo "Copying project files..."
cp -r ./* $APP_DIR/
cp -r ./server $APP_DIR/server
cp -r ./dist $APP_DIR/dist 2>/dev/null || true

cd $APP_DIR

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
npm install --production=false
npm run build

# Install server dependencies
echo "Installing server dependencies..."
cd $APP_DIR/server
npm install

echo -e "${YELLOW}[6/7] Configuring Nginx...${NC}"

# Create Nginx config
cat > /etc/nginx/sites-available/barbershop << 'NGINX_CONF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /assets {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
NGINX_CONF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/barbershop

# Enable site
ln -sf /etc/nginx/sites-available/barbershop /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx

echo -e "${YELLOW}[7/7] Starting application with PM2...${NC}"
cd $APP_DIR/server

# Stop existing instance if running
pm2 delete barbershop 2>/dev/null || true

# Start server
pm2 start index.js --name barbershop
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
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
echo -e "${YELLOW}⚠️  IMPORTANT: Change the default password!${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  ${GREEN}pm2 logs barbershop${NC}     - View logs"
echo -e "  ${GREEN}pm2 restart barbershop${NC}  - Restart server"
echo -e "  ${GREEN}pm2 status${NC}              - Check status"
echo -e "  ${GREEN}systemctl reload nginx${NC}  - Reload Nginx"
echo ""
echo -e "To setup SSL (HTTPS) with Let's Encrypt:"
echo -e "  ${GREEN}apt install certbot python3-certbot-nginx${NC}"
echo -e "  ${GREEN}certbot --nginx -d $DOMAIN${NC}"
echo ""
