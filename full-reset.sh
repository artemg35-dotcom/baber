#!/bin/bash

# ============================================
# Full Reset Script - Complete reinstall
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/opt/barbershop"

echo ""
echo "🔧 BarberShop Full Reset"
echo "========================"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root${NC}"
    exit 1
fi

echo -e "${YELLOW}This will:${NC}"
echo "  1. Stop the server"
echo "  2. Remove all data (database)"
echo "  3. Reinstall dependencies"
echo "  4. Restart the server"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${YELLOW}[1/6] Stopping server...${NC}"
pm2 stop barbershop 2>/dev/null || true
pm2 delete barbershop 2>/dev/null || true
sleep 2

echo -e "${YELLOW}[2/6] Checking Node.js version...${NC}"
NODE_VERSION=$(node --version | cut -d'.' -f1 | tr -d 'v')
echo "Node.js version: $(node --version)"
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required (you have $NODE_VERSION)${NC}"
    echo "Install Node.js 20:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi
echo -e "${GREEN}Node.js version OK${NC}"

echo -e "${YELLOW}[3/6] Removing old database...${NC}"
cd "$APP_DIR/server"
rm -f barbershop.db barbershop.db-wal barbershop.db-shm
echo -e "${GREEN}Database removed${NC}"

echo -e "${YELLOW}[4/6] Reinstalling server dependencies...${NC}"
rm -rf node_modules package-lock.json
npm install --production
echo -e "${GREEN}Dependencies installed${NC}"

echo -e "${YELLOW}[5/6] Testing server startup...${NC}"
# Try to start and capture any errors
timeout 5 node index.js 2>&1 | head -20 &
SERVER_PID=$!
sleep 3

# Check if it's still running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}Server starts successfully!${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
else
    echo -e "${RED}Server failed to start. Output:${NC}"
    wait $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo -e "${YELLOW}[6/6] Starting server with PM2...${NC}"
pm2 start index.js --name barbershop
sleep 3

# Check status
if pm2 status barbershop | grep -q "online"; then
    echo -e "${GREEN}✅ Server is running!${NC}"
    
    # Test health endpoint
    sleep 2
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server responding correctly!${NC}"
        echo ""
        echo "Health check response:"
        curl -s http://localhost:3001/api/health
        echo ""
    else
        echo -e "${YELLOW}⚠️  Server started but not responding yet${NC}"
        echo "Wait a few seconds and try: curl http://localhost:3001/api/health"
    fi
else
    echo -e "${RED}❌ Server failed to start${NC}"
    echo ""
    echo "Logs:"
    pm2 logs barbershop --lines 50 --nostream
    exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Reset complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Default admin credentials: admin / admin123"
echo ""
echo "Check logs: pm2 logs barbershop"
echo "Check status: pm2 status"
echo ""
