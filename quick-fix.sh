#!/bin/bash

# ============================================
# Quick Fix Script - Update files and restart
# ============================================
# Run from project directory: sudo bash quick-fix.sh
# Or run on server: sudo bash quick-fix.sh
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/opt/barbershop"

echo ""
echo "🔧 BarberShop Quick Fix"
echo "======================="
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root${NC}"
    exit 1
fi

# Determine source directory
if [ -f "./server/index.js" ]; then
    SRC_DIR="$(pwd)"
elif [ -d "$APP_DIR" ]; then
    SRC_DIR="$APP_DIR"
else
    echo -e "${RED}Error: Cannot find project files${NC}"
    exit 1
fi

echo -e "${YELLOW}Source directory: $SRC_DIR${NC}"
echo ""

echo -e "${YELLOW}[1/5] Stopping server...${NC}"
pm2 stop barbershop 2>/dev/null || true
sleep 2

echo -e "${YELLOW}[2/5] Updating server files...${NC}"
# Copy updated server files
if [ "$SRC_DIR" != "$APP_DIR" ]; then
    cp -r "$SRC_DIR/server/"* "$APP_DIR/server/"
    cp -r "$SRC_DIR/dist" "$APP_DIR/" 2>/dev/null || true
    echo -e "${GREEN}Files updated from $SRC_DIR${NC}"
else
    echo -e "${GREEN}Files already in place${NC}"
fi

echo -e "${YELLOW}[3/5] Reinstalling server dependencies...${NC}"
cd "$APP_DIR/server"
npm install --production --quiet
echo -e "${GREEN}Dependencies installed${NC}"

echo -e "${YELLOW}[4/5] Removing old database (will be recreated)...${NC}"
if [ -f "$APP_DIR/server/barbershop.db" ]; then
    # Backup first
    BACKUP_NAME="barbershop.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$APP_DIR/server/barbershop.db" "$APP_DIR/server/$BACKUP_NAME"
    echo -e "${GREEN}Backup created: $BACKUP_NAME${NC}"
    
    rm -f "$APP_DIR/server/barbershop.db"
    rm -f "$APP_DIR/server/barbershop.db-wal"
    rm -f "$APP_DIR/server/barbershop.db-shm"
    echo -e "${GREEN}Old database removed${NC}"
else
    echo -e "${YELLOW}No database file found${NC}"
fi

echo -e "${YELLOW}[5/5] Starting server...${NC}"
cd "$APP_DIR/server"
pm2 delete barbershop 2>/dev/null || true
pm2 start index.js --name barbershop
sleep 3

# Check status
echo ""
if pm2 status barbershop | grep -q "online"; then
    echo -e "${GREEN}✅ Server is running!${NC}"
    
    # Test health endpoint
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server responding correctly!${NC}"
        echo ""
        curl -s http://localhost:3001/api/health | head -1
    else
        echo -e "${YELLOW}⚠️  Server started but not responding yet${NC}"
    fi
else
    echo -e "${RED}❌ Server failed to start${NC}"
    echo ""
    echo "Logs:"
    pm2 logs barbershop --lines 30 --nostream
    exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Fix complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Default admin credentials: admin / admin123"
echo ""
echo "Check logs: pm2 logs barbershop"
echo "Check status: pm2 status"
echo ""
