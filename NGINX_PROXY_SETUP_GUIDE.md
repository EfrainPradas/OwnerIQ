# OwnerIQ - Nginx Reverse Proxy Setup Guide

**Date:** November 4, 2025
**Purpose:** Configure nginx to proxy API requests for Google Labs access
**Server:** http://3.145.4.238/

---

## 🎯 What This Does

This configuration allows Google Labs (and any external service) to access your OwnerIQ application through **port 80 only**:

- **Frontend:** `http://3.145.4.238/` → React app
- **Backend API:** `http://3.145.4.238/api/*` → Proxied to `localhost:5000/api/*`

**Benefits:**
- ✅ Only port 80 needs to be open (more secure)
- ✅ Backend port 5000 stays internal (not exposed)
- ✅ CORS configured for external access
- ✅ Production-ready setup

---

## 📋 Prerequisites

- SSH access to EC2 instance at `3.145.4.238`
- Your SSH key file (`.pem` file)
- Sudo privileges on the server
- Backend running on port 5000

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Copy Files to Server

From your local machine:

```bash
# Navigate to project directory
cd /home/efraiprada/projects/OwnerIQ

# Copy the setup script to server
scp -i /path/to/your-key.pem setup-nginx-proxy.sh ubuntu@3.145.4.238:~/

# Optional: Copy nginx config file too
scp -i /path/to/your-key.pem nginx-production.conf ubuntu@3.145.4.238:~/
```

### Step 2: SSH into Server

```bash
ssh -i /path/to/your-key.pem ubuntu@3.145.4.238
```

### Step 3: Run Setup Script

```bash
# Make script executable
chmod +x setup-nginx-proxy.sh

# Run the setup
sudo ./setup-nginx-proxy.sh
```

The script will:
- ✅ Backup existing nginx config
- ✅ Create new configuration with API proxy
- ✅ Test the configuration
- ✅ Reload nginx
- ✅ Verify backend is running

### Step 4: Test the Setup

```bash
# Test frontend
curl http://3.145.4.238/

# Test API (should work now!)
curl http://3.145.4.238/api/properties
```

---

## 🔧 Manual Setup (if script doesn't work)

### 1. Backup Existing Config

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

### 2. Edit Nginx Config

```bash
sudo nano /etc/nginx/sites-available/default
```

### 3. Replace with This Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Logging
    access_log /var/log/nginx/owneriq_access.log;
    error_log /var/log/nginx/owneriq_error.log;

    # Frontend
    root /var/www/html;
    index index.html;

    # File upload limit
    client_max_body_size 50M;

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
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

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With, Accept' always;
            add_header 'Access-Control-Max-Age' 3600;
            return 204;
        }
    }

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Test and Reload

```bash
# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx
```

---

## 🧪 Testing & Verification

### Test from Server

```bash
# Test frontend (should return HTML)
curl http://localhost/

# Test API through proxy (should return JSON or require auth)
curl http://localhost/api/properties

# Test from external IP
curl http://3.145.4.238/
curl http://3.145.4.238/api/properties
```

### Test from Your Computer

Open browser and try:
- http://3.145.4.238/ (should load the app)
- http://3.145.4.238/api/properties (should show API response or auth error)

### For Google Labs

Share this URL: **http://3.145.4.238/**

The API will be automatically accessible at: **http://3.145.4.238/api/**

---

## 🔍 Troubleshooting

### Problem: "502 Bad Gateway"

**Cause:** Backend not running or not on port 5000

**Fix:**
```bash
# Check if backend is running
ps aux | grep node

# Check port 5000
sudo lsof -i :5000

# Start backend if needed
cd /path/to/owneriq/backend
pm2 start server.js --name owneriq-backend
# or
node server.js &
```

### Problem: "Connection refused"

**Cause:** Nginx not running

**Fix:**
```bash
# Start nginx
sudo systemctl start nginx

# Enable on boot
sudo systemctl enable nginx
```

### Problem: API requests return 404

**Cause:** Proxy path mismatch

**Fix:**
- Make sure your backend routes are defined as `/api/*`
- Check backend logs: `pm2 logs` or check where backend logs are

### Problem: CORS errors

**Cause:** CORS headers not being sent

**Fix:**
- Verify the `add_header` directives are in the nginx config
- Make sure you're testing from the actual domain (not localhost)
- Check browser console for specific CORS error

---

## 📊 Monitoring

### View Nginx Logs

```bash
# Access log (requests)
sudo tail -f /var/log/nginx/owneriq_access.log

# Error log (issues)
sudo tail -f /var/log/nginx/owneriq_error.log

# All nginx logs
sudo tail -f /var/log/nginx/*.log
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### Check Backend Status

```bash
# If using PM2
pm2 status
pm2 logs owneriq-backend

# If running directly
ps aux | grep node
```

---

## 🔐 Security Notes

### Current Setup (Development/Demo)

- ✅ Port 80 open for HTTP
- ✅ CORS allows all origins (`*`)
- ⚠️ No HTTPS/SSL (traffic not encrypted)
- ⚠️ Backend port 5000 should NOT be open in security group

### For Production (Future)

You should:
1. **Add HTTPS** using Let's Encrypt/Certbot
2. **Restrict CORS** to specific domains
3. **Add rate limiting** to prevent abuse
4. **Enable fail2ban** for SSH protection
5. **Use PM2** to manage backend process
6. **Set up monitoring** (CloudWatch, Datadog, etc.)

---

## 📝 Files Created

1. **`nginx-production.conf`** - Nginx configuration file
2. **`setup-nginx-proxy.sh`** - Automated setup script
3. **`NGINX_PROXY_SETUP_GUIDE.md`** - This guide

---

## ✅ Success Checklist

After setup, verify:

- [ ] Frontend loads at http://3.145.4.238/
- [ ] API accessible at http://3.145.4.238/api/
- [ ] No 502 Bad Gateway errors
- [ ] No CORS errors in browser console
- [ ] Backend running on port 5000
- [ ] Nginx running and enabled
- [ ] Logs show successful requests

---

## 🆘 Getting Help

If you encounter issues:

1. **Check nginx error log:**
   ```bash
   sudo tail -100 /var/log/nginx/owneriq_error.log
   ```

2. **Test nginx config:**
   ```bash
   sudo nginx -t
   ```

3. **Verify backend is running:**
   ```bash
   curl http://localhost:5000/
   ```

4. **Restart services:**
   ```bash
   sudo systemctl restart nginx
   pm2 restart owneriq-backend
   ```

---

**Last Updated:** November 4, 2025
**Tested On:** Ubuntu 20.04/22.04 LTS
**Nginx Version:** 1.18+
