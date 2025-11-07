#!/bin/bash

################################################################################
# OwnerIQ Automatic Deployment Script
# From: Local Ubuntu Machine
# To: Production Server 3.145.4.238
################################################################################

set -e  # Exit on any error

# Configuration
SERVER="3.145.4.238"
USER="admin"
KEY_PATH="$HOME/OwnerIQ-connection/OwnerIQ.pem"
REMOTE_BACKEND_DIR="~/ownerIQ-backend"
REMOTE_FRONTEND_DIR="~/ownerIQ-frontend"
LOCAL_PROJECT_DIR="/home/efraiprada/projects/OwnerIQ"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}  OwnerIQ Deployment Script${NC}"
echo -e "${BLUE}  Target: ${SERVER}${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Check if SSH key exists
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${RED}❌ Error: SSH key not found at $KEY_PATH${NC}"
    echo "Please ensure the key file exists."
    exit 1
fi

# Set correct permissions for SSH key
chmod 600 "$KEY_PATH"

echo -e "${YELLOW}📋 Step 1: Testing SSH connection...${NC}"
if ssh -i "$KEY_PATH" -o ConnectTimeout=5 "$USER@$SERVER" "echo '✅ SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection verified${NC}"
else
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Step 2: Syncing Backend code...${NC}"
rsync -avz --delete \
    -e "ssh -i $KEY_PATH" \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude '.git' \
    --exclude 'uploads' \
    --exclude '*.log' \
    "$LOCAL_PROJECT_DIR/backend/" "$USER@$SERVER:$REMOTE_BACKEND_DIR/"

echo -e "${GREEN}✅ Backend code synced${NC}"

echo ""
echo -e "${YELLOW}📋 Step 3: Syncing Frontend code...${NC}"
rsync -avz --delete \
    -e "ssh -i $KEY_PATH" \
    --exclude 'node_modules' \
    --exclude '.env.local' \
    --exclude '.git' \
    --exclude 'build' \
    --exclude '*.log' \
    "$LOCAL_PROJECT_DIR/frontend/" "$USER@$SERVER:$REMOTE_FRONTEND_DIR/"

echo -e "${GREEN}✅ Frontend code synced${NC}"

echo ""
echo -e "${YELLOW}📋 Step 4: Installing dependencies and building on server...${NC}"

ssh -i "$KEY_PATH" "$USER@$SERVER" << 'ENDSSH'
set -e

echo "🔧 Installing backend dependencies..."
cd ~/ownerIQ-backend
npm install --production=false
npm install openai pdf-parse

echo ""
echo "🔧 Installing frontend dependencies..."
cd ~/ownerIQ-frontend
npm install --production=false

echo ""
echo "🏗️  Building frontend..."
cd ~/ownerIQ-frontend
npm run build

echo ""
echo "📦 Copying build to Nginx directory..."
sudo mkdir -p /home/admin/build
sudo cp -r build/* /home/admin/build/
sudo chown -R admin:admin /home/admin/build
sudo chmod -R 755 /home/admin/build

echo ""
echo "🔄 Restarting services..."
pm2 stop all || true
pm2 delete all || true

echo ""
echo "🚀 Starting backend..."
cd ~/ownerIQ-backend
pm2 start npm --name "owneriq-backend" -- run dev --update-env

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null << 'NGINXCONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /home/admin/build;
    index index.html;

    server_name _;

    # Increase client body size limit for large PDFs (50MB)
    client_max_body_size 50M;

    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase body size for API uploads
        client_max_body_size 50M;
    }

    # Serve static files
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router - serve index.html for all non-file requests
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXCONF

# Remove any conflicting nginx configs
sudo rm -f /etc/nginx/sites-enabled/owneriq
sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

echo ""
echo "🔄 Restarting Nginx..."
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "📊 Service Status:"
pm2 status

echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager | head -5

ENDSSH

echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}🌐 Application URL: http://${SERVER}${NC}"
echo ""
echo -e "${YELLOW}📝 Post-deployment commands:${NC}"
echo -e "  View logs:        ${BLUE}ssh -i $KEY_PATH $USER@$SERVER 'pm2 logs owneriq-backend'${NC}"
echo -e "  Check status:     ${BLUE}ssh -i $KEY_PATH $USER@$SERVER 'pm2 status'${NC}"
echo -e "  Restart backend:  ${BLUE}ssh -i $KEY_PATH $USER@$SERVER 'pm2 restart owneriq-backend'${NC}"
echo -e "  Restart Nginx:    ${BLUE}ssh -i $KEY_PATH $USER@$SERVER 'sudo systemctl restart nginx'${NC}"
echo ""
