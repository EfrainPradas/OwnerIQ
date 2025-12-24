#!/bin/bash
cd /var/www/ownerIQ/backend

# Install all dependencies from package.json
echo "Installing all dependencies..."
npm install

# Restart PM2
echo "Restarting backend..."
pm2 restart owneriq-backend

# Wait and check logs
sleep 5
echo "=== PM2 Status ==="
pm2 status

echo "=== Recent error logs ==="
tail -30 ~/.pm2/logs/owneriq-backend-error.log

echo "=== Testing API ==="
curl -s http://localhost:5001 || echo "API not responding"
