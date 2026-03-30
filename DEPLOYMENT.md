# 🚀 Deployment Guide: Exness Trading Platform

Complete step-by-step guide to deploy your trading platform to production.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Backend Deployment (DigitalOcean)](#backend-deployment-digitalocean)
4. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Architecture:**

- **Backend**: DigitalOcean Droplet (or App Platform) with Docker
- **Frontend**: Vercel
- **Database**: DigitalOcean Managed PostgreSQL (TimescaleDB)
- **Cache**: DigitalOcean Managed Redis
- **WebSocket**: Same server as backend

**Ports:**

- Backend API: 3001
- WebSocket: 3002

---

## Prerequisites

### Required Accounts

- [ ] DigitalOcean account ([Sign up](https://www.digitalocean.com/))
- [ ] Vercel account ([Sign up](https://vercel.com/))
- [ ] Domain name (optional but recommended)

### Required Tools

```bash
# Install DigitalOcean CLI
brew install doctl  # macOS
# or download from: https://docs.digitalocean.com/reference/doctl/how-to/install/

# Install Vercel CLI
npm install -g vercel

# Verify installations
doctl version
vercel --version
```

---

## Backend Deployment (DigitalOcean)

### Step 1: Set Up DigitalOcean Database Services

#### 1.1 Create PostgreSQL Database (TimescaleDB)

```bash
# Via DigitalOcean Dashboard:
# 1. Go to Databases → Create Database Cluster
# 2. Choose PostgreSQL 15+
# 3. Select region (choose closest to your users)
# 4. Choose plan (Development: $15/mo, Production: $60/mo+)
# 5. Name it: exness-postgres
# 6. Create cluster

# Wait 5-10 minutes for provisioning

# Once ready, note down:
# - Host: your-db-cluster.db.ondigitalocean.com
# - Port: 25060
# - Username: doadmin
# - Password: [generated password]
# - Database: defaultdb
# - SSL: Required
```

#### 1.2 Enable TimescaleDB Extension

```bash
# Connect to your database via DO console or using psql:
psql "postgresql://doadmin:[password]@your-db-cluster.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Run:
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Verify:
\dx
# You should see timescaledb in the list
```

#### 1.3 Redis Configuration

**Redis will run on the same instance as your backend** (included in Droplet or container), saving $15/month!

- No separate Redis cluster needed
- Runs in Docker alongside backend
- Secure (not exposed externally)
- Automatic backups with Docker volumes

> **Note**: If you need managed Redis for high availability, you can still create a DigitalOcean Redis cluster, but for most use cases, running Redis locally is sufficient.

### Step 2: Deploy Backend Application

#### Option A: Using DigitalOcean App Platform (Recommended - Easier)

```bash
cd price-poller-be

# 1. Create app.yaml configuration
cat > app.yaml << EOF
name: exness-trading-backend
services:
- name: api
  github:
    repo: imsidkg/exness
    branch: main
    deploy_on_push: true
  source_dir: /price-poller-be
  dockerfile_path: price-poller-be/Dockerfile
  http_port: 3001
  instance_count: 1
  instance_size_slug: basic-xs  # $5/mo
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3001"
  - key: WS_PORT
    value: "3002"
  - key: DB_USER
    value: doadmin
  - key: DB_HOST
    value: your-db-cluster.db.ondigitalocean.com
  - key: DB_NAME
    value: defaultdb
  - key: DB_PASSWORD
    type: SECRET
    value: YOUR_DB_PASSWORD
  - key: DB_PORT
    value: "25060"
  - key: DB_SSL
    value: "true"
  - key: REDIS_HOST
    value: redis
  - key: REDIS_PORT
    value: "6379"
  - key: REDIS_PASSWORD
    value: ""
  - key: REDIS_TLS
    value: "false"
  - key: JWT_SECRET
    type: SECRET
    value: YOUR_STRONG_JWT_SECRET_MIN_32_CHARS
  - key: CORS_ORIGIN
    value: https://your-frontend.vercel.app
  routes:
  - path: /
EOF

# 2. Deploy to App Platform
doctl apps create --spec app.yaml

# 3. Monitor deployment
doctl apps list
doctl apps logs <app-id> --type BUILD --follow

# Your backend will be available at:
# https://exness-trading-backend-xxxxx.ondigitalocean.app
```

#### Option B: Using Docker on a Droplet (More Control - with Redis on instance)

For a detailed step-by-step guide with Redis running on the same instance, see **[DEPLOYMENT_DROPLET.md](price-poller-be/DEPLOYMENT_DROPLET.md)**

**Quick steps:**

```bash
# 1. Create a Droplet
# Via DO Dashboard:
# - Create Droplet
# - Ubuntu 22.04 LTS
# - Basic plan (Regular Intel, 2GB RAM, $12/mo minimum)
# - Choose region
# - Add SSH key
# - Name: exness-backend

# 2. SSH into your droplet
ssh root@your-droplet-ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get update
apt-get install -y docker-compose

# 4. Clone your repository
git clone https://github.com/imsidkg/exness.git
cd exness/price-poller-be

# 5. Create production .env file
nano .env

# Paste your production environment variables:
NODE_ENV=production
PORT=3001
WS_PORT=3002
DB_USER=doadmin
DB_HOST=your-db-cluster.db.ondigitalocean.com
DB_NAME=defaultdb
DB_PASSWORD=your_db_password
DB_PORT=25060
DB_SSL=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
CORS_ORIGIN=https://your-frontend.vercel.app

# Save and exit (Ctrl+X, Y, Enter)

# 6. Build and run with Docker Compose (includes Redis)
docker-compose -f docker-compose.prod.yml up -d --build

# 7. Check if running
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f

# 8. Configure firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (for Nginx)
ufw allow 443/tcp   # HTTPS (for Nginx)
ufw enable

# Note: Don't expose 3001/3002 directly - use Nginx reverse proxy
```

**For complete setup including Nginx, SSL, and domain configuration, see [DEPLOYMENT_DROPLET.md](price-poller-be/DEPLOYMENT_DROPLET.md)**

### Step 3: Initialize Database Schema

```bash
# Connect to your backend (via SSH if using Droplet, or App Platform console)

# Run initialization manually or via script
# Option 1: Using psql directly
psql "postgresql://doadmin:[password]@your-db-cluster.db.ondigitalocean.com:25060/defaultdb?sslmode=require" < src/db/init.sql

# Option 2: Via the application
# The init.ts should run automatically on startup
# Check logs to verify:
docker logs exness-backend | grep "Database initialized"
```

### Step 4: Set Up Domain (Optional but Recommended)

```bash
# 1. Point your domain to DigitalOcean
# Add A record: api.yourdomain.com → your-droplet-ip

# 2. Install Nginx as reverse proxy
apt-get install -y nginx certbot python3-certbot-nginx

# 3. Create Nginx configuration
cat > /etc/nginx/sites-available/exness << 'EOF'
# HTTP API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# WebSocket
server {
    listen 80;
    server_name ws.yourdomain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# 4. Enable site
ln -s /etc/nginx/sites-available/exness /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 5. Get SSL certificates
certbot --nginx -d api.yourdomain.com -d ws.yourdomain.com

# Your backend is now available at:
# https://api.yourdomain.com
# wss://ws.yourdomain.com
```

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

```bash
cd frontend

# 1. Create production environment file
cat > .env.production << EOF
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://ws.yourdomain.com
EOF

# Or if using App Platform without domain:
# VITE_API_URL=https://exness-trading-backend-xxxxx.ondigitalocean.app
# VITE_WS_URL=wss://exness-trading-backend-xxxxx.ondigitalocean.app

# 2. Test build locally
bun install
bun run build

# Check dist folder
ls -la dist/
```

### Step 2: Deploy to Vercel

```bash
# Option A: Via Vercel CLI
vercel login
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: exness-trading
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod

# Option B: Via Vercel Dashboard
# 1. Go to https://vercel.com/new
# 2. Import Git Repository
# 3. Select your GitHub repo
# 4. Configure:
#    - Framework Preset: Vite
#    - Root Directory: frontend
#    - Build Command: bun run build
#    - Output Directory: dist
#    - Install Command: bun install
# 5. Add Environment Variables:
#    VITE_API_URL=https://api.yourdomain.com
#    VITE_WS_URL=wss://ws.yourdomain.com
# 6. Deploy

# Your frontend will be available at:
# https://exness-trading-xxxxx.vercel.app
```

### Step 3: Configure Custom Domain (Optional)

```bash
# Via Vercel Dashboard:
# 1. Go to Project Settings → Domains
# 2. Add domain: yourdomain.com
# 3. Follow DNS configuration instructions
# 4. Wait for DNS propagation (5-10 minutes)

# Your site will be available at:
# https://yourdomain.com
```

---

## Post-Deployment Configuration

### Step 1: Update CORS Settings

```bash
# Update backend environment variable:
# For App Platform:
doctl apps update <app-id> --spec app.yaml

# For Droplet:
ssh root@your-droplet-ip
cd exness/price-poller-be
nano .env
# Update CORS_ORIGIN to your Vercel URL
# CORS_ORIGIN=https://yourdomain.com

# Restart container
docker restart exness-backend
```

### Step 2: Test End-to-End

```bash
# 1. Open your frontend URL
# 2. Create an account
# 3. Login
# 4. Check if prices are updating (WebSocket working)
# 5. Place a test trade
# 6. Check backend logs for any errors

# Check backend logs:
# App Platform:
doctl apps logs <app-id> --follow

# Droplet:
docker logs -f exness-backend
```

### Step 3: Set Up Monitoring

```bash
# For Droplet - Install monitoring agent
# 1. Go to DO Dashboard → Monitoring
# 2. Follow instructions to install agent on your droplet

curl -sSL https://repos.insights.digitalocean.com/install.sh | bash

# Set up alerts:
# - CPU usage > 80%
# - Memory usage > 80%
# - Disk usage > 80%
# - Service down
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check backend health
curl https://api.yourdomain.com/
# Should return: "Hello from the price poller BE!"

# Check WebSocket
# Use browser console:
const ws = new WebSocket('wss://ws.yourdomain.com');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### Logs

```bash
# App Platform:
doctl apps logs <app-id> --type RUN --follow

# Droplet:
docker logs -f exness-backend
docker logs --tail 100 exness-backend

# Nginx logs (if using):
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Backups

```bash
# DigitalOcean Managed Databases have automatic daily backups
# To create manual backup:
# 1. Go to DO Dashboard → Databases → Your Database
# 2. Backups & Restore → Create Backup

# To backup manually:
pg_dump "postgresql://doadmin:[password]@your-db-cluster.db.ondigitalocean.com:25060/defaultdb?sslmode=require" > backup_$(date +%Y%m%d).sql
```

### Updates

```bash
# Update backend code:
# For App Platform - Push to GitHub (auto-deploys)
git push origin main

# For Droplet:
ssh root@your-droplet-ip
cd exness/price-poller-be
git pull
docker build -t exness-backend .
docker stop exness-backend
docker rm exness-backend
docker run -d --name exness-backend --env-file .env -p 3001:3001 -p 3002:3002 --restart unless-stopped exness-backend

# Update frontend - Push to GitHub (Vercel auto-deploys)
git push origin main
```

---

## Troubleshooting

### Backend Not Connecting to Database

```bash
# Check database connectivity
docker exec -it exness-backend sh
nc -zv your-db-cluster.db.ondigitalocean.com 25060

# Check environment variables
docker exec exness-backend env | grep DB_

# Check logs
docker logs exness-backend | grep -i "database\|error"
```

### WebSocket Not Connecting

```bash
# Check if WebSocket port is open
nc -zv your-droplet-ip 3002

# Check firewall
ufw status

# Check Nginx config (if using)
nginx -t
cat /etc/nginx/sites-enabled/exness

# Test WebSocket directly
wscat -c ws://your-droplet-ip:3002
```

### CORS Errors

```bash
# Check CORS_ORIGIN environment variable
echo $CORS_ORIGIN

# Should match your frontend URL exactly
# Update in .env and restart
docker restart exness-backend

# Check browser console for exact error
# Open frontend → F12 → Console
```

### High Memory Usage

```bash
# Check memory usage
docker stats exness-backend

# Check for memory leaks in logs
docker logs exness-backend | grep -i "memory\|heap"

# Restart if necessary
docker restart exness-backend

# Consider upgrading Droplet if consistently high
```

### Database Connection Pool Exhausted

```bash
# Check active connections
docker logs exness-backend | grep "connection"

# Increase pool size in db.ts:
# max: 20 (default is 10)

# Rebuild and restart
```

---

## Cost Estimate

### DigitalOcean (Monthly)

- **Droplet** (2GB RAM): $12 (includes Redis)
- **Managed PostgreSQL** (Development): $15
- **Total**: ~$27/month

**OR**

- **App Platform** (Basic): $5
- **Managed PostgreSQL** (Development): $15
- **Total**: ~$20/month (Redis included in app)

### Vercel

- **Hobby Plan**: Free (with limits)
- **Pro Plan**: $20/month (recommended for production)

### Total Monthly Cost: $20-47 (with Redis on instance)

**Cost Breakdown:**

- **Minimum** (App Platform): $20/mo
- **Recommended** (Droplet + Vercel Pro): $47/mo
- **Previous cost** (with managed Redis): $62/mo
- **Savings**: $15-42/mo by running Redis locally!

---

## Security Checklist

- [ ] Use strong JWT secret (min 32 characters)
- [ ] Enable SSL/TLS for all connections
- [ ] Use environment variables for all secrets
- [ ] Enable firewall on Droplet
- [ ] Regular database backups
- [ ] Monitor for suspicious activity
- [ ] Keep dependencies updated
- [ ] Use strong database passwords
- [ ] Limit database access to specific IPs (optional)
- [ ] Enable 2FA on DigitalOcean and Vercel accounts

---

## Support

For issues:

1. Check logs first
2. Review troubleshooting section
3. Check DigitalOcean/Vercel status pages
4. Review GitHub issues

---

## Next Steps

After successful deployment:

1. Set up monitoring and alerts
2. Configure automated backups
3. Set up staging environment
4. Implement CI/CD pipeline
5. Add performance monitoring
6. Set up error tracking (e.g., Sentry)

---

**Congratulations! Your trading platform is now live! 🎉**
