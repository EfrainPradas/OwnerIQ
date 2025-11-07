# Deployment Guide for Production (Debian Server)

## Prerequisites
- Debian server with Nginx installed
- Node.js installed on server
- PM2 installed globally (`npm install -g pm2`)

## Step 1: Build Frontend

On your local machine:

```bash
cd frontend
npm run build
```

This creates a `build` folder with optimized production files.

## Step 2: Copy Files to Server

Copy the build folder and backend to your Debian server:

```bash
# Copy frontend build
scp -r frontend/build/* user@your-server:/var/www/html/

# Copy backend
scp -r backend user@your-server:/home/user/owneriq/
```

## Step 3: Configure Backend on Server

SSH into your server and set up the backend:

```bash
ssh user@your-server

# Navigate to backend directory
cd /home/user/owneriq/backend

# Install dependencies
npm install

# Create/update .env file with production values
nano .env
```

Make sure your backend `.env` has:
```
SUPABASE_URL=https://zapanqzqloibnbsvkbob.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGFucXpxbG9pYm5ic3ZrYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTgzNTIsImV4cCI6MjA3NDU3NDM1Mn0.mwspXsW5xDu9CmWruosq3d0w_mPX5g-zGhZkFgCxHqM
JWT_SECRET=your_secret_key_here
PORT=5000
ENABLE_DEMO_MODE=false
RAPIDAPI_KEY=1f89628a9fmsh337ca7272df9f7ep12ae6ejsnb0b3992c7f1a
```

## Step 4: Start Backend with PM2

```bash
# Start the backend server
pm2 start server.js --name owneriq-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 5: Configure Nginx

Create/update Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/default
```

Use this configuration:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm;

    server_name _;

    # Frontend - serve React app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 6: Restart Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 7: Verify Deployment

1. Check backend is running:
```bash
pm2 status
pm2 logs owneriq-backend
```

2. Test API endpoint:
```bash
curl http://localhost:5000/
```

3. Open your browser and navigate to your server's IP address

## Troubleshooting

### Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This means the frontend is trying to call the API but getting HTML instead. Check:

1. **Backend is running**: `pm2 status`
2. **Nginx proxy is configured correctly**: Check `/etc/nginx/sites-available/default`
3. **API_BASE_URL is empty in production**: Should use relative URLs like `/api/...`

### Backend not starting

Check logs:
```bash
pm2 logs owneriq-backend
```

Common issues:
- Missing dependencies: Run `npm install` in backend directory
- Port 5000 already in use: Change PORT in `.env`
- Missing environment variables: Check `.env` file

### Nginx 502 Bad Gateway

- Backend is not running: `pm2 restart owneriq-backend`
- Wrong port in Nginx config: Should be `proxy_pass http://localhost:5000;`

## Quick Redeploy

After making changes:

```bash
# On local machine
cd frontend
npm run build
scp -r build/* user@your-server:/var/www/html/

# On server (if backend changed)
cd /home/user/owneriq/backend
git pull  # or copy new files
pm2 restart owneriq-backend
```

## Monitoring

```bash
# View backend logs
pm2 logs owneriq-backend

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check backend status
pm2 status