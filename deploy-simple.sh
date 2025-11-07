#!/bin/bash

# Simple Deployment Script for OwnerIQ
# Quick and straightforward deployment

set -e

SERVER_IP="3.145.4.238"
SERVER_USER="admin"
PEM_FILE="./connection/OwnerIQ.pem"

echo "=================================="
echo "  OwnerIQ Quick Deploy"
echo "=================================="
echo ""

# Set PEM permissions
chmod 600 "$PEM_FILE"

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..
echo "✅ Frontend built"
echo ""

# Upload frontend
echo "📤 Uploading frontend to server..."
scp -r -i "$PEM_FILE" frontend/build/* ${SERVER_USER}@${SERVER_IP}:/var/www/ownerIQ-frontend/
echo "✅ Frontend uploaded"
echo ""

# Create directories on server with correct permissions
echo "📁 Creating directories on server..."
ssh -i "$PEM_FILE" ${SERVER_USER}@${SERVER_IP} << 'EOFDIR'
sudo mkdir -p /var/www/ownerIQ-backend
sudo mkdir -p /var/www/ownerIQ-frontend
sudo chown -R admin:admin /var/www/ownerIQ-backend
sudo chown -R admin:admin /var/www/ownerIQ-frontend
EOFDIR
echo "✅ Directories ready"
echo ""

# Upload backend
echo "📤 Uploading backend to server..."
scp -r -i "$PEM_FILE" backend/* ${SERVER_USER}@${SERVER_IP}:/var/www/ownerIQ-backend/
echo "✅ Backend uploaded"
echo ""

# Restart backend
echo "🔄 Restarting backend..."
ssh -i "$PEM_FILE" ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /var/www/ownerIQ-backend
npm install --production 2>/dev/null || true
pm2 restart owneriq-backend || pm2 start server.js --name owneriq-backend
pm2 save
EOF
echo "✅ Backend restarted"
echo ""

echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "Application URL: http://3.145.4.238"
echo ""
