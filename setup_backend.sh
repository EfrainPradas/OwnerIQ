#!/bin/bash
# Setup OwnerIQ backend on server

cd /var/www/ownerIQ/backend

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing owneriq process if running
pm2 delete owneriq-backend 2>/dev/null || true

# Start the backend with PM2
echo "Starting OwnerIQ backend..."
pm2 start server.js --name owneriq-backend --env production

# Save PM2 config for auto-restart on reboot
pm2 save

echo "Backend started! Checking status..."
pm2 status

# Test if the API is responding
sleep 3
curl -s http://localhost:5001/api/health || echo "API health check failed, checking logs..."
