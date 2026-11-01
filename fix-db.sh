#!/bin/bash

# ============================================
# Fix Database Schema Issue
# ============================================
# Run: sudo bash fix-db.sh
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/opt/barbershop"

echo ""
echo "🔧 BarberShop Database Fix Tool"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo bash fix-db.sh)${NC}"
    exit 1
fi

echo -e "${YELLOW}This will fix database schema issues by:${NC}"
echo "  1. Stopping the server"
echo "  2. Backing up the old database"
echo "  3. Removing the old database"
echo "  4. Restarting the server (will create fresh database)"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${YELLOW}[1/4] Stopping server...${NC}"
pm2 stop barbershop 2>/dev/null || true
sleep 2

echo -e "${YELLOW}[2/4] Backing up old database...${NC}"
if [ -f "$APP_DIR/server/barbershop.db" ]; then
    BACKUP_NAME="barbershop.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$APP_DIR/server/barbershop.db" "$APP_DIR/server/$BACKUP_NAME"
    echo -e "${GREEN}Backup created: $BACKUP_NAME${NC}"
else
    echo -e "${YELLOW}No database file found${NC}"
fi

echo -e "${YELLOW}[3/4] Removing old database...${NC}"
rm -f "$APP_DIR/server/barbershop.db"
rm -f "$APP_DIR/server/barbershop.db-wal"
rm -f "$APP_DIR/server/barbershop.db-shm"
echo -e "${GREEN}Old database removed${NC}"

echo -e "${YELLOW}[4/4] Restarting server...${NC}"
cd "$APP_DIR/server"
pm2 start index.js --name barbershop
sleep 3

# Check if server started successfully
if pm2 status barbershop | grep -q "online"; then
    echo -e "${GREEN}✅ Server started successfully!${NC}"
    echo ""
    echo "Checking server health..."
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is responding correctly!${NC}"
    else
        echo -e "${YELLOW}⚠️  Server started but not responding yet. Wait a few seconds and try again.${NC}"
    fi
else
    echo -e "${RED}❌ Server failed to start. Check logs:${NC}"
    pm2 logs barbershop --lines 20 --nostream
    exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Database fix complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "The server has been restarted with a fresh database."
echo "Default admin credentials: admin / admin123"
echo ""
echo "If you had important data in the old database, it's backed up at:"
echo "  $APP_DIR/server/$BACKUP_NAME"
echo ""
