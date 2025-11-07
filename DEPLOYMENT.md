# OwnerIQ Production Deployment Guide

This guide explains how to deploy the OwnerIQ application to a production server.

## Prerequisites

- Ubuntu server with SSH access
- PEM key file for authentication (`connection/OwnerIQ.pem`)
- Node.js and npm installed locally
- Internet access from your local machine

## Server Requirements

The deployment script will automatically install these on the server:
- Node.js 20.x
- PM2 (Process Manager)
- Nginx (Web Server)

## Quick Start

### 1. Deploy the Application

Run the deployment script:

```bash
cd /home/efraiprada/projects/OwnerIQ
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. ✅ Build the frontend production bundle
2. ✅ Create a deployment package
3. ✅ Upload files to the server
4. ✅ Install dependencies on the server
5. ✅ Configure and start the backend with PM2
6. ✅ Configure Nginx as a reverse proxy
7. ✅ Start the application

### 2. Access the Application

Once deployment is complete, access the application at:

**http://3.145.4.238**

## Architecture

The production deployment uses the following architecture:

```
┌─────────────────────────────────────────────────────────┐
│  Internet                                                │
└────────────────────────┬────────────────────────────────┘
                         │
                    Port 80 (HTTP)
                         │
┌────────────────────────▼────────────────────────────────┐
│  Nginx (Web Server & Reverse Proxy)                     │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │  Static Files    │         │   API Proxy        │   │
│  │  /               │         │   /api → :5000     │   │
│  │  React App       │         │                    │   │
│  └──────────────────┘         └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                                        │
                                   Port 5000
                                        │
┌───────────────────────────────────────▼─────────────────┐
│  Node.js Backend (Express)                              │
│  Managed by PM2                                         │
│  - API endpoints                                        │
│  - AI Pipeline processing                               │
│  - PDF parsing                                          │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure on Server

```
/home/ubuntu/owneriq/
├── backend/
│   ├── server.js           # Backend entry point
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication, etc.
│   ├── ai-pipeline/        # AI document processing
│   ├── .env                # Environment variables
│   └── node_modules/       # Backend dependencies
├── frontend/
│   └── build/              # Production React build
├── logs/                   # Application logs
├── uploads/                # Uploaded documents
└── ecosystem.config.js     # PM2 configuration
```

## Server Management

### View Application Logs

```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 logs owneriq-backend'
```

### Check Application Status

```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 status'
```

### Restart Backend

```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 restart owneriq-backend'
```

### Stop Backend

```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 stop owneriq-backend'
```

### View Nginx Logs

```bash
# Access logs
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'sudo tail -f /var/log/nginx/access.log'

# Error logs
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'sudo tail -f /var/log/nginx/error.log'
```

### Restart Nginx

```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'sudo systemctl restart nginx'
```

## Updating Environment Variables

To update environment variables in production:

1. SSH into the server:
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238
```

2. Edit the `.env` file:
```bash
cd /home/ubuntu/owneriq/backend
nano .env
```

3. Update the values and save (Ctrl+X, Y, Enter)

4. Restart the backend:
```bash
pm2 restart owneriq-backend
```

## Re-deploying After Code Changes

After making code changes locally, simply run the deployment script again:

```bash
./deploy.sh
```

The script will:
- Build a fresh frontend bundle
- Upload the new files
- Restart the backend automatically

## Troubleshooting

### Application Not Starting

Check PM2 logs for errors:
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 logs owneriq-backend --lines 100'
```

### 502 Bad Gateway Error

This means Nginx can't connect to the backend:

1. Check if backend is running:
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 status'
```

2. If not running, start it:
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'cd /home/ubuntu/owneriq/backend && pm2 start server.js --name owneriq-backend'
```

### Can't Connect to Server

1. Verify PEM file permissions:
```bash
chmod 600 connection/OwnerIQ.pem
```

2. Check server is running and accessible

3. Verify security group allows SSH (port 22) and HTTP (port 80)

### Database Connection Issues

1. Check Supabase credentials in `.env`
2. Verify Supabase project is active
3. Check network connectivity from server to Supabase

## Security Considerations

### Important: Update Production Secrets

After first deployment, update these values in `/home/ubuntu/owneriq/backend/.env`:

1. **JWT_SECRET**: Generate a strong random secret
```bash
# Generate a secure random string
openssl rand -base64 32
```

2. **Disable Demo Mode**: Set `ENABLE_DEMO_MODE=false`

3. **API Keys**: Verify all API keys are production keys, not test keys

### Firewall Configuration

Ensure your AWS Security Group allows:
- Port 22 (SSH) - From your IP only
- Port 80 (HTTP) - From anywhere (0.0.0.0/0)
- Port 443 (HTTPS) - From anywhere (for future SSL)

### Future Enhancements

1. **SSL/HTTPS**: Add Let's Encrypt SSL certificate
2. **Domain Name**: Configure a custom domain
3. **Monitoring**: Add uptime monitoring and alerts
4. **Backups**: Implement automated backup strategy
5. **CDN**: Use CloudFront for static asset delivery

## Performance Optimization

The production configuration includes:

- **Gzip Compression**: Nginx compresses responses
- **Static Asset Caching**: 1-year cache for JS/CSS/images
- **PM2 Process Management**: Auto-restart on crashes
- **Increased Timeouts**: 10-minute timeout for AI processing
- **Large Upload Support**: 50MB max file size

## Monitoring

### Check Application Health

```bash
# Backend health
curl http://3.145.4.238/api/properties

# Frontend
curl http://3.145.4.238/
```

### Monitor Resource Usage

```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 monit'
```

## Rollback

If you need to rollback to a previous version:

1. Keep a backup of the working code
2. Deploy the backup using the same script
3. Or manually revert files on the server

## Support

For deployment issues:
- Check logs: `pm2 logs owneriq-backend`
- Review nginx logs: `/var/log/nginx/error.log`
- Verify environment variables
- Check firewall/security group settings

---

**Last Updated**: 2025-10-17
**Server IP**: 3.145.4.238
**Application**: OwnerIQ Real Estate Portfolio Management
