# 🚀 Droplet Deployment Guide (with Redis on Instance)

This guide covers deploying to a DigitalOcean Droplet with Redis running on the same instance.

## 🎯 Architecture

```
┌─────────────────────────────────────────────┐
│        DigitalOcean Droplet                 │
│  ┌───────────────────────────────────────┐  │
│  │         Nginx (Reverse Proxy)         │  │
│  │    :80 → :443 (SSL)                   │  │
│  └───────────────┬───────────────────────┘  │
│                  │                           │
│  ┌───────────────▼───────────────────────┐  │
│  │      Docker Container Network         │  │
│  │                                       │  │
│  │  ┌─────────────┐   ┌──────────────┐  │  │
│  │  │   Backend   │   │    Redis     │  │  │
│  │  │   (3001)    │◄──┤   (6379)     │  │  │
│  │  │   (3002)    │   │              │  │  │
│  │  └─────────────┘   └──────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                  │                           │
│  ┌───────────────▼───────────────────────┐  │
│  │     External DB (DigitalOcean)        │  │
│  │     PostgreSQL + TimescaleDB          │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 📋 Prerequisites

- DigitalOcean account
- Domain name (optional but recommended)
- DigitalOcean PostgreSQL database (managed)
- SSH key configured

## 💰 Cost Breakdown

| Service    | Specification             | Cost/Month |
| ---------- | ------------------------- | ---------- |
| Droplet    | 2GB RAM, 1 vCPU, 50GB SSD | $12        |
| PostgreSQL | Development tier          | $15        |
| **Total**  |                           | **$27/mo** |

**Cost Savings**: $15/mo by running Redis on the Droplet instead of managed Redis!

---

## 🚀 Step-by-Step Deployment

### Step 1: Create PostgreSQL Database

```bash
# Via DigitalOcean Dashboard:
# 1. Go to Databases → Create Database Cluster
# 2. Choose PostgreSQL 15+
# 3. Select region (closest to your users)
# 4. Choose Development plan ($15/mo)
# 5. Name it: exness-postgres
# 6. Create cluster (takes 5-10 minutes)

# Note down these values:
# - Host: your-db.db.ondigitalocean.com
# - Port: 25060
# - Username: doadmin
# - Password: [generated]
# - Database: defaultdb
```

### Step 2: Enable TimescaleDB Extension

```bash
# Connect to database using DO console or psql:
psql "postgresql://doadmin:[password]@your-db.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Enable TimescaleDB:
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Verify:
\dx
# Should show timescaledb in the list

# Exit:
\q
```

### Step 3: Create and Configure Droplet

```bash
# Via DigitalOcean Dashboard:
# 1. Create → Droplets
# 2. Choose Ubuntu 22.04 LTS
# 3. Plan: Basic
# 4. CPU: Regular Intel (2GB / 1 CPU) - $12/mo
# 5. Choose same region as your database
# 6. Authentication: SSH Key (add yours)
# 7. Hostname: exness-backend
# 8. Create Droplet

# Wait for droplet to be created (~1 minute)
# Note the IP address: XXX.XXX.XXX.XXX
```

### Step 4: Initial Server Setup

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install -y docker-compose

# Verify installations
docker --version
docker-compose --version

# Install Git
apt-get install -y git

# Create swap file (for 2GB droplet)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

### Step 5: Deploy Application

```bash
# Clone your repository
cd /opt
git clone https://github.com/imsidkg/exness.git
cd exness/price-poller-be

# Create production environment file
nano .env

# Paste and update with your values:
```

```bash
# Server Configuration
PORT=3001
WS_PORT=3002
NODE_ENV=production

# Database Configuration (DigitalOcean Managed PostgreSQL)
DB_USER=doadmin
DB_HOST=your-db.db.ondigitalocean.com
DB_NAME=defaultdb
DB_PASSWORD=your_actual_db_password_here
DB_PORT=25060
DB_SSL=true

# Redis Configuration (Local on same instance)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

# JWT Configuration (Generate a strong secret!)
JWT_SECRET=your_super_strong_32_character_secret_key_here_change_this

# CORS Configuration (Update after deploying frontend)
CORS_ORIGIN=http://localhost:5173
```

```bash
# Save and exit (Ctrl+X, Y, Enter)

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# You should see:
# - Backend connected to PostgreSQL
# - Redis connected
# - WebSocket server started
# - No errors

# Press Ctrl+C to exit logs
```

### Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Don't expose backend ports directly - Nginx will proxy
# ufw allow 3001/tcp  # NOT NEEDED
# ufw allow 3002/tcp  # NOT NEEDED

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### Step 7: Install and Configure Nginx

```bash
# Install Nginx
apt-get install -y nginx

# Create Nginx configuration
nano /etc/nginx/sites-available/exness
```

Paste this configuration:

```nginx
# Backend API
upstream backend_api {
    server localhost:3001;
}

# Backend WebSocket
upstream backend_ws {
    server localhost:3002;
}

# HTTP Server (will redirect to HTTPS)
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server for API
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # API endpoints
    location / {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# WebSocket Server
server {
    listen 80;
    server_name ws.yourdomain.com;

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ws.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/ws.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/ws.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://backend_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/exness /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# If using domain, proceed to Step 8
# If using IP only, modify config and restart:
systemctl restart nginx
```

### Step 8: Configure Domain (Optional but Recommended)

```bash
# 1. Point your domain to Droplet IP
# In your domain registrar (e.g., Namecheap, GoDaddy):
# Add A records:
# api.yourdomain.com → YOUR_DROPLET_IP
# ws.yourdomain.com → YOUR_DROPLET_IP

# Wait for DNS propagation (5-30 minutes)
# Test: ping api.yourdomain.com

# 2. Install Certbot for SSL
apt-get install -y certbot python3-certbot-nginx

# 3. Get SSL certificates
certbot --nginx -d api.yourdomain.com -d ws.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS

# 4. Test auto-renewal
certbot renew --dry-run

# SSL certificates will auto-renew
```

### Step 9: Initialize Database Schema

```bash
# The database schema should initialize automatically on first run
# Check logs:
docker-compose -f docker-compose.prod.yml logs backend | grep -i "database\|initialized"

# If you need to run manually:
docker-compose -f docker-compose.prod.yml exec backend sh

# Inside container:
# Run your init script or SQL
# exit
```

### Step 10: Test Deployment

```bash
# Test backend API (use your domain or IP)
curl https://api.yourdomain.com/
# Should return: "Hello from the price poller BE!"

# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check Redis is accessible
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
# Should return: PONG

# Check logs for any errors
docker-compose -f docker-compose.prod.yml logs --tail=50
```

---

## 🔄 Updating Your Application

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

cd /opt/exness/price-poller-be

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📊 Monitoring

### Check Service Status

```bash
# All services
docker-compose -f docker-compose.prod.yml ps

# Logs
docker-compose -f docker-compose.prod.yml logs -f

# Just backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Just Redis logs
docker-compose -f docker-compose.prod.yml logs -f redis
```

### Check Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop  # Install: apt-get install htop

# Disk usage
df -h

# Memory usage
free -h
```

### Check Redis

```bash
# Connect to Redis CLI
docker-compose -f docker-compose.prod.yml exec redis redis-cli

# Inside Redis:
INFO
PING
KEYS *
exit
```

---

## 🛠️ Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check if ports are in use
netstat -tulpn | grep -E '3001|3002'

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose -f docker-compose.prod.yml ps redis

# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis

# Make sure REDIS_HOST=redis in .env (not localhost)
```

### Database Connection Issues

```bash
# Test database connection from droplet
apt-get install -y postgresql-client

psql "postgresql://doadmin:PASSWORD@your-db.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# If connection fails:
# - Check DB_HOST, DB_PASSWORD in .env
# - Verify DB_SSL=true
# - Check database is running in DO dashboard
# - Check firewall settings
```

### Out of Memory

```bash
# Check memory
free -h

# Restart services to free memory
docker-compose -f docker-compose.prod.yml restart

# Clear Docker cache
docker system prune -a

# Consider upgrading to 4GB Droplet ($24/mo)
```

### Nginx Issues

```bash
# Check Nginx status
systemctl status nginx

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Check error logs
tail -f /var/log/nginx/error.log
```

---

## 🔒 Security Best Practices

### 1. Change Default Passwords

```bash
# Set Redis password (optional but recommended)
nano docker-compose.prod.yml
# Change: command: redis-server --requirepass YOUR_REDIS_PASSWORD

# Update .env
# REDIS_PASSWORD=YOUR_REDIS_PASSWORD

# Restart
docker-compose -f docker-compose.prod.yml restart
```

### 2. Limit Redis Access

```bash
# Redis is only accessible within Docker network
# No external port exposure = secure by default ✓
```

### 3. Regular Updates

```bash
# Update system packages
apt-get update && apt-get upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Backup Redis Data

```bash
# Redis data is persisted in Docker volume
# Manual backup:
docker-compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE

# Copy backup
docker cp exness-backend-redis-1:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

---

## 📦 Cleanup (If Needed)

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove volumes (CAUTION: Deletes Redis data)
docker-compose -f docker-compose.prod.yml down -v

# Remove all Docker data
docker system prune -a --volumes
```

---

## ✅ Deployment Checklist

- [ ] DigitalOcean PostgreSQL created
- [ ] TimescaleDB extension enabled
- [ ] Droplet created (2GB minimum)
- [ ] SSH access configured
- [ ] Docker and Docker Compose installed
- [ ] Application code cloned
- [ ] .env file configured with correct credentials
- [ ] Services started with docker-compose
- [ ] Firewall configured
- [ ] Nginx installed and configured
- [ ] Domain DNS configured (if using)
- [ ] SSL certificates installed (if using domain)
- [ ] Database schema initialized
- [ ] Backend API responding
- [ ] Redis accessible within Docker network
- [ ] Frontend deployed and CORS updated

---

## 🎉 Success!

Your backend is now running with Redis on the same instance, saving $15/month!

**Your backend URLs:**

- API: `https://api.yourdomain.com` (or `http://YOUR_DROPLET_IP:3001`)
- WebSocket: `wss://ws.yourdomain.com` (or `ws://YOUR_DROPLET_IP:3002`)

**Update frontend .env.production:**

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://ws.yourdomain.com
```

Now deploy your frontend to Vercel!
