#!/bin/bash

##
## OwnerIQ - Nginx Reverse Proxy Setup Script
##
## This script configures nginx to:
## 1. Serve React frontend on port 80
## 2. Proxy /api/ requests to Node.js backend on port 5000
## 3. Enable CORS for Google Labs access
##
## Usage: Run this on your EC2 instance (3.145.4.238)
##   chmod +x setup-nginx-proxy.sh
##   sudo ./setup-nginx-proxy.sh
##

set -e  # Exit on any error

echo "================================================================"
echo "OwnerIQ - Nginx Reverse Proxy Configuration"
echo "================================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo "✓ Running as root"

# Backup existing nginx config
echo ""
echo "📦 Backing up existing nginx configuration..."
if [ -f /etc/nginx/sites-available/default ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backup created"
else
    echo "⚠️  No existing config found (fresh install)"
fi

# Create new nginx configuration
echo ""
echo "📝 Creating new nginx configuration..."

cat > /etc/nginx/sites-available/default <<'NGINX_CONFIG'
##
## OwnerIQ Production Nginx Configuration
##

server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Logging
    access_log /var/log/nginx/owneriq_access.log;
    error_log /var/log/nginx/owneriq_error.log;

    # Frontend - React Build
    root /var/www/html;
    index index.html;

    # Increase max body size for file uploads
    client_max_body_size 50M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5000/api/;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for AI requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With, Accept' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        # Handle OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With, Accept' always;
            add_header 'Access-Control-Max-Age' 3600;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Serve static files
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires 0;
    }

    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }

    location = /robots.txt {
        access_log off;
        log_not_found off;
    }
}
NGINX_CONFIG

echo "✓ Configuration file created"

# Test nginx configuration
echo ""
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✓ Configuration is valid"
else
    echo "❌ Configuration test failed!"
    echo "   Restoring backup..."
    if [ -f /etc/nginx/sites-available/default.backup.* ]; then
        cp /etc/nginx/sites-available/default.backup.* /etc/nginx/sites-available/default
    fi
    exit 1
fi

# Reload nginx
echo ""
echo "🔄 Reloading nginx..."
systemctl reload nginx

if systemctl is-active --quiet nginx; then
    echo "✓ Nginx reloaded successfully"
else
    echo "❌ Nginx failed to reload"
    exit 1
fi

# Check if backend is running
echo ""
echo "🔍 Checking backend status..."
if curl -s http://localhost:5000/api/properties > /dev/null 2>&1 || curl -s http://localhost:5000/ > /dev/null 2>&1; then
    echo "✓ Backend is running on port 5000"
else
    echo "⚠️  Backend doesn't seem to be running on port 5000"
    echo "   You may need to start it with: pm2 start backend/server.js"
fi

echo ""
echo "================================================================"
echo "✅ Nginx configuration complete!"
echo "================================================================"
echo ""
echo "Your app is now accessible at: http://3.145.4.238/"
echo "API endpoint: http://3.145.4.238/api/"
echo ""
echo "Test with:"
echo "  curl http://3.145.4.238/"
echo "  curl http://3.145.4.238/api/properties"
echo ""
echo "Logs:"
echo "  sudo tail -f /var/log/nginx/owneriq_access.log"
echo "  sudo tail -f /var/log/nginx/owneriq_error.log"
echo ""
