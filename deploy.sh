#!/bin/bash

# OwnerIQ Deployment Script
# This script deploys the application to the production server

set -e  # Exit on error

# Configuration
SERVER_IP="3.145.4.238"
SERVER_USER="ubuntu"
PEM_FILE="./connection/OwnerIQ.pem"
REMOTE_DIR="/home/ubuntu/owneriq"
LOCAL_DIR="$(pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   OwnerIQ Production Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if PEM file exists
if [ ! -f "$PEM_FILE" ]; then
    echo -e "${RED}❌ Error: PEM file not found at $PEM_FILE${NC}"
    exit 1
fi

# Set correct permissions for PEM file
echo -e "${YELLOW}🔐 Setting PEM file permissions...${NC}"
chmod 600 "$PEM_FILE"

# Test SSH connection
echo -e "${YELLOW}🔍 Testing SSH connection to server...${NC}"
if ! ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "echo 'Connection successful'" &> /dev/null; then
    echo -e "${RED}❌ Error: Cannot connect to server${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo "  - Server IP: $SERVER_IP"
    echo "  - PEM file: $PEM_FILE"
    echo "  - Internet connection"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"

# Build frontend
echo -e "${YELLOW}📦 Building frontend production bundle...${NC}"
cd "$LOCAL_DIR/frontend"
npm run build
echo -e "${GREEN}✅ Frontend build complete${NC}"

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
cd "$LOCAL_DIR"
mkdir -p deploy-temp

# Copy backend files
cp -r backend deploy-temp/
cp package.json deploy-temp/ 2>/dev/null || true

# Copy frontend build
mkdir -p deploy-temp/frontend
cp -r frontend/build deploy-temp/frontend/

# Copy configuration files
cp ecosystem.config.js deploy-temp/ 2>/dev/null || true

# Create .env file template for server
cat > deploy-temp/backend/.env.production << 'EOF'
# Production Environment Variables
# IMPORTANT: Update these values on the server!

SUPABASE_URL=https://zapanqzqloibnbsvkbob.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGFucXpxbG9pYm5ic3ZrYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTgzNTIsImV4cCI6MjA3NDU3NDM1Mn0.mwspXsW5xDu9CmWruosq3d0w_mPX5g-zGhZkFgCxHqM
JWT_SECRET=your_production_secret_key_here_change_this
PORT=5000
ENABLE_DEMO_MODE=false

# RapidAPI Configuration
RAPIDAPI_KEY=1f89628a9fmsh337ca7272df9f7ep12ae6ejsnb0b3992c7f1a

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# AI Pipeline Configuration
AI_PROVIDER=openai
AI_CLASSIFIER_MODEL=gpt-4o-mini
AI_EXTRACTOR_MODEL=gpt-4o
ENABLE_AI_CACHE=true
LOG_LEVEL=info
LOG_AI_REQUESTS=false

# Node Environment
NODE_ENV=production
EOF

echo -e "${GREEN}✅ Deployment package created${NC}"

# Create remote directory structure
echo -e "${YELLOW}📁 Creating remote directory structure...${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    # Create directories
    mkdir -p /home/ubuntu/owneriq
    mkdir -p /home/ubuntu/owneriq/logs

    # Install Node.js if not installed
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    # Install PM2 globally if not installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
    fi

    # Install nginx if not installed
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        sudo apt-get update
        sudo apt-get install -y nginx
    fi

    echo "Server dependencies checked"
ENDSSH
echo -e "${GREEN}✅ Remote directory structure ready${NC}"

# Upload files to server
echo -e "${YELLOW}📤 Uploading files to server...${NC}"
rsync -avz --delete \
    -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'uploads' \
    deploy-temp/ \
    "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"

echo -e "${GREEN}✅ Files uploaded${NC}"

# Install dependencies and start application
echo -e "${YELLOW}🚀 Installing dependencies and starting application...${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    cd /home/ubuntu/owneriq

    # Install backend dependencies
    cd backend
    npm install --production

    # Copy production env file
    if [ ! -f .env ]; then
        cp .env.production .env
        echo "⚠️  WARNING: Please update the .env file with production values!"
    fi

    cd ..

    # Install root dependencies (pdf-parse, openai)
    npm install --production 2>/dev/null || true

    # Stop existing PM2 processes
    pm2 stop owneriq-backend 2>/dev/null || true
    pm2 delete owneriq-backend 2>/dev/null || true

    # Start backend with PM2
    cd backend
    pm2 start server.js --name owneriq-backend --time
    pm2 save

    # Setup PM2 to start on boot
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

    echo "Application started successfully!"
ENDSSH

echo -e "${GREEN}✅ Application deployed and started${NC}"

# Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/owneriq > /dev/null << 'EOF'
server {
    listen 80;
    server_name 3.145.4.238;

    # Frontend - serve static files
    location / {
        root /home/ubuntu/owneriq/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for AI processing
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # Increase max body size for file uploads
    client_max_body_size 50M;
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/owneriq /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Test nginx configuration
    sudo nginx -t

    # Restart nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx

    echo "Nginx configured successfully!"
ENDSSH

echo -e "${GREEN}✅ Nginx configured${NC}"

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -rf deploy-temp
echo -e "${GREEN}✅ Cleanup complete${NC}"

# Show status
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Application is now running at:${NC}"
echo -e "  ${BLUE}http://3.145.4.238${NC}"
echo ""
echo -e "${YELLOW}Server Management Commands:${NC}"
echo -e "  View logs:        ${BLUE}ssh -i $PEM_FILE ubuntu@3.145.4.238 'pm2 logs owneriq-backend'${NC}"
echo -e "  Restart backend:  ${BLUE}ssh -i $PEM_FILE ubuntu@3.145.4.238 'pm2 restart owneriq-backend'${NC}"
echo -e "  Stop backend:     ${BLUE}ssh -i $PEM_FILE ubuntu@3.145.4.238 'pm2 stop owneriq-backend'${NC}"
echo -e "  Server status:    ${BLUE}ssh -i $PEM_FILE ubuntu@3.145.4.238 'pm2 status'${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Update the .env file on the server with production values!${NC}"
echo -e "  ${BLUE}ssh -i $PEM_FILE ubuntu@3.145.4.238 'nano /home/ubuntu/owneriq/backend/.env'${NC}"
echo ""
