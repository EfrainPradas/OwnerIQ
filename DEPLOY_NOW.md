# 🚀 Deploy OwnerIQ to Production - Quick Guide

## Prerequisites Checklist

- [x] Server IP: `3.145.4.238`
- [x] PEM file: `connection/OwnerIQ.pem`
- [x] Node.js installed locally
- [x] Internet connection

## Deploy in 3 Steps

### Step 1: Navigate to Project Directory

```bash
cd /home/efraiprada/projects/OwnerIQ
```

### Step 2: Run Deployment Script

```bash
./deploy.sh
```

That's it! The script will:
- ✅ Build frontend
- ✅ Upload to server
- ✅ Install dependencies
- ✅ Configure Nginx
- ✅ Start application

### Step 3: Access Your Application

Open in browser:
```
http://3.145.4.238
```

## After First Deployment

### Update Production Secret (Important!)

1. SSH into server:
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238
```

2. Generate new JWT secret:
```bash
openssl rand -base64 32
```

3. Edit environment file:
```bash
nano /home/ubuntu/owneriq/backend/.env
```

4. Update `JWT_SECRET` with the generated value

5. Restart backend:
```bash
pm2 restart owneriq-backend
exit
```

## Common Commands

### View Logs
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 logs owneriq-backend'
```

### Check Status
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 status'
```

### Restart Application
```bash
ssh -i connection/OwnerIQ.pem ubuntu@3.145.4.238 'pm2 restart owneriq-backend'
```

## Re-deploy After Code Changes

Just run the script again:
```bash
./deploy.sh
```

## Need Help?

See full documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Server**: 3.145.4.238  
**Application**: OwnerIQ Real Estate Portfolio Management  
**Stack**: React + Node.js + Express + Supabase
