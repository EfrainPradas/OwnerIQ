#!/bin/bash

echo "=========================================="
echo "OwnerIQ Server Diagnostics & Fix Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "1. Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js is installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js is NOT installed${NC}"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
echo ""
echo "2. Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm is installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm is NOT installed${NC}"
    exit 1
fi

# Check if backend directory exists
echo ""
echo "3. Checking backend directory..."
if [ -d "backend" ]; then
    echo -e "${GREEN}✓ Backend directory exists${NC}"
    cd backend
else
    echo -e "${RED}✗ Backend directory not found${NC}"
    exit 1
fi

# Check if package.json exists
echo ""
echo "4. Checking package.json..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json found${NC}"
else
    echo -e "${RED}✗ package.json not found${NC}"
    exit 1
fi

# Check if node_modules exists
echo ""
echo "5. Checking node_modules..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules directory exists${NC}"
else
    echo -e "${YELLOW}⚠ node_modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Check if .env file exists
echo ""
echo "6. Checking .env file..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    echo "Environment variables:"
    grep -v "^#" .env | grep -v "^$"
else
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

# Check if port 5000 is in use
echo ""
echo "7. Checking if port 5000 is available..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 5000 is already in use${NC}"
    echo "Process using port 5000:"
    lsof -Pi :5000 -sTCP:LISTEN
    echo ""
    read -p "Do you want to kill this process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        PID=$(lsof -Pi :5000 -sTCP:LISTEN -t)
        kill -9 $PID
        echo -e "${GREEN}✓ Process killed${NC}"
    fi
else
    echo -e "${GREEN}✓ Port 5000 is available${NC}"
fi

# Check nginx status
echo ""
echo "8. Checking nginx status..."
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ nginx is running${NC}"
    else
        echo -e "${YELLOW}⚠ nginx is installed but not running${NC}"
        echo "Starting nginx..."
        sudo systemctl start nginx
    fi
else
    echo -e "${YELLOW}⚠ nginx is not installed${NC}"
fi

# Test Supabase connection
echo ""
echo "9. Testing Supabase connection..."
SUPABASE_URL=$(grep SUPABASE_URL .env | cut -d '=' -f2)
if [ -n "$SUPABASE_URL" ]; then
    if curl -s --head --request GET "$SUPABASE_URL" | grep "200 OK" > /dev/null; then
        echo -e "${GREEN}✓ Supabase connection successful${NC}"
    else
        echo -e "${YELLOW}⚠ Cannot reach Supabase URL${NC}"
    fi
else
    echo -e "${RED}✗ SUPABASE_URL not found in .env${NC}"
fi

# Start the server
echo ""
echo "=========================================="
echo "Starting Node.js server..."
echo "=========================================="
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to manage the server..."
    pm2 stop owneriq-backend 2>/dev/null
    pm2 delete owneriq-backend 2>/dev/null
    pm2 start server.js --name owneriq-backend
    pm2 save
    echo ""
    echo -e "${GREEN}✓ Server started with PM2${NC}"
    echo "Use 'pm2 logs owneriq-backend' to view logs"
    echo "Use 'pm2 status' to check status"
else
    echo -e "${YELLOW}⚠ PM2 not installed. Starting server with node...${NC}"
    echo "Installing PM2 globally..."
    sudo npm install -g pm2
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PM2 installed${NC}"
        pm2 start server.js --name owneriq-backend
        pm2 save
        pm2 startup
        echo -e "${GREEN}✓ Server started with PM2${NC}"
    else
        echo -e "${YELLOW}⚠ Could not install PM2. Starting with node...${NC}"
        nohup node server.js > server.log 2>&1 &
        echo -e "${GREEN}✓ Server started in background${NC}"
        echo "Check server.log for output"
    fi
fi

# Wait a moment for server to start
sleep 3

# Test the API
echo ""
echo "10. Testing API endpoints..."
if curl -s http://localhost:5000/ | grep -q "OwnerIQ API"; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${RED}✗ API is not responding${NC}"
    echo "Check the logs for errors"
fi

echo ""
echo "=========================================="
echo "Diagnostics Complete!"
echo "=========================================="
echo ""
echo "Server should now be running on http://localhost:5000"
echo "Frontend should be accessible at http://3.145.4.238"
echo ""
echo "Useful commands:"
echo "  - pm2 status              : Check server status"
echo "  - pm2 logs owneriq-backend: View server logs"
echo "  - pm2 restart owneriq-backend: Restart server"
echo "  - pm2 stop owneriq-backend: Stop server"
echo ""