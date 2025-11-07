#!/bin/bash
##
## OwnerIQ - Quick Setup Commands
## Copy-paste these commands to set up nginx proxy
##

# ============================================================
# RUN THESE COMMANDS ON YOUR LOCAL MACHINE FIRST
# ============================================================

echo "Step 1: Copy setup script to EC2 server"
echo "Run this from /home/efraiprada/projects/OwnerIQ:"
echo ""
echo "scp -i YOUR_KEY.pem setup-nginx-proxy.sh ubuntu@3.145.4.238:~/"
echo ""
echo "Step 2: SSH into the server"
echo "ssh -i YOUR_KEY.pem ubuntu@3.145.4.238"
echo ""
echo "================================================================"
echo ""

# ============================================================
# THEN RUN THESE COMMANDS ON THE EC2 SERVER (3.145.4.238)
# ============================================================

cat << 'SERVER_COMMANDS'

# ============================================================
# Commands to run on EC2 server (3.145.4.238)
# ============================================================

# 1. Make script executable
chmod +x setup-nginx-proxy.sh

# 2. Run the setup script
sudo ./setup-nginx-proxy.sh

# 3. Test the setup
curl http://localhost/
curl http://localhost/api/properties

# 4. Test from external IP
curl http://3.145.4.238/
curl http://3.145.4.238/api/properties

# 5. Check logs (if needed)
sudo tail -f /var/log/nginx/owneriq_error.log

# ============================================================
# If backend is not running, start it:
# ============================================================

# Check if backend is running
ps aux | grep node

# If using PM2:
cd /var/www/owneriq/backend  # or wherever your backend is
pm2 start server.js --name owneriq-backend
pm2 save
pm2 startup

# If not using PM2:
cd /var/www/owneriq/backend
nohup node server.js > backend.log 2>&1 &

# ============================================================
# Verify everything is working:
# ============================================================

# Check nginx status
sudo systemctl status nginx

# Check nginx config
sudo nginx -t

# View recent logs
sudo tail -50 /var/log/nginx/owneriq_access.log
sudo tail -50 /var/log/nginx/owneriq_error.log

# Test endpoints
curl -I http://localhost/
curl -I http://localhost/api/properties

SERVER_COMMANDS
