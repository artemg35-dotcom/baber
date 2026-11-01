#!/bin/bash

# ============================================
# BarberShop Diagnostic Script
# Run: sudo bash diagnose.sh
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/opt/barbershop"

echo ""
echo "🔍 BarberShop Diagnostic Tool"
echo "=============================="
echo ""

# 1. Check if application directory exists
echo -n "📁 Application directory ($APP_DIR): "
if [ -d "$APP_DIR" ]; then
    echo -e "${GREEN}EXISTS${NC}"
else
    echo -e "${RED}NOT FOUND${NC}"
    echo "   → Run deploy.sh first"
    exit 1
fi

# 2. Check if dist directory exists
echo -n "📁 Frontend build (dist/): "
if [ -d "$APP_DIR/dist" ]; then
    echo -e "${GREEN}EXISTS${NC}"
else
    echo -e "${RED}NOT FOUND${NC}"
    echo "   → Run: cd $APP_DIR && npm run build"
fi

# 3. Check Node.js
echo -n "📦 Node.js: "
if command -v node &> /dev/null; then
    echo -e "${GREEN}$(node --version)${NC}"
else
    echo -e "${RED}NOT INSTALLED${NC}"
fi

# 4. Check PM2
echo -n "📦 PM2: "
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}installed${NC}"
else
    echo -e "${RED}NOT INSTALLED${NC}"
    echo "   → Run: npm install -g pm2"
fi

# 5. Check if barbershop process is running
echo -n "🔄 PM2 process 'barbershop': "
if pm2 describe barbershop &> /dev/null; then
    STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"barbershop"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$STATUS" = "online" ]; then
        echo -e "${GREEN}ONLINE${NC}"
    else
        echo -e "${RED}$STATUS${NC}"
        echo "   → Run: pm2 logs barbershop --lines 30"
    fi
else
    echo -e "${RED}NOT FOUND${NC}"
    echo "   → Run: cd $APP_DIR/server && pm2 start index.js --name barbershop"
fi

# 6. Check if server is responding
echo -n "🌐 Server (localhost:3001): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}OK (200)${NC}"
else
    echo -e "${RED}FAIL ($HTTP_CODE)${NC}"
    echo "   → Check: pm2 logs barbershop --lines 30"
fi

# 7. Check Nginx
echo -n "🌐 Nginx: "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}RUNNING${NC}"
else
    echo -e "${RED}NOT RUNNING${NC}"
    echo "   → Run: systemctl start nginx"
fi

# 8. Check Nginx config
echo -n "📋 Nginx config: "
if [ -f "/etc/nginx/sites-enabled/barbershop" ]; then
    echo -e "${GREEN}EXISTS${NC}"
else
    echo -e "${RED}NOT FOUND${NC}"
    echo "   → Run deploy.sh again or create config manually"
fi

# 9. Check Nginx proxy
echo -n "🔗 Nginx → Backend proxy: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}OK (200)${NC}"
elif [ "$HTTP_CODE" = "502" ]; then
    echo -e "${RED}502 BAD GATEWAY${NC}"
    echo "   → Nginx can't reach backend. Check if server is running on port 3001"
else
    echo -e "${YELLOW}HTTP $HTTP_CODE${NC}"
fi

# 10. Check port 3001
echo -n "🔌 Port 3001 listening: "
if ss -tlnp | grep -q ":3001"; then
    echo -e "${GREEN}YES${NC}"
else
    echo -e "${RED}NO${NC}"
    echo "   → Server is not listening on port 3001"
fi

# 11. Check database
echo -n "🗄️  Database: "
if [ -f "$APP_DIR/server/barbershop.db" ]; then
    SIZE=$(du -h "$APP_DIR/server/barbershop.db" | cut -f1)
    echo -e "${GREEN}EXISTS ($SIZE)${NC}"
else
    echo -e "${YELLOW}NOT CREATED YET${NC} (will be created on first server start)"
fi

# 12. Show PM2 logs (last 10 lines)
echo ""
echo "📋 Last PM2 logs:"
echo "---"
pm2 logs barbershop --lines 10 --nostream 2>/dev/null || echo "No logs available"
echo "---"

echo ""
echo "📋 Quick fix commands:"
echo ""
echo "  Restart server:"
echo "    pm2 restart barbershop"
echo ""
echo "  View full logs:"
echo "    pm2 logs barbershop"
echo ""
echo "  Rebuild frontend:"
echo "    cd $APP_DIR && npm run build"
echo ""
echo "  Restart Nginx:"
echo "    systemctl restart nginx"
echo ""
echo "  Full redeploy:"
echo "    sudo bash deploy.sh your-domain.com"
echo ""
