# 🚀 Quick Deploy Guide - Neon + Redis Setup

## Overview

Your trading platform now uses:

- **Database**: Neon (Serverless PostgreSQL) - FREE tier
- **Cache**: Redis on same instance - $0 extra cost
- **Backend**: DigitalOcean Droplet - $12/mo
- **Frontend**: Vercel - FREE

**Total: $12/month for full production setup!** 🎉

---

## 📋 Prerequisites

- [x] Neon account created
- [x] Database created on Neon
- [x] Connection string obtained
- [x] DigitalOcean account
- [x] Domain name (optional)

---

## ⚡ Quick Start (15 minutes)

### Step 1: Enable TimescaleDB on Neon (2 min)

```bash
# Connect to your Neon database
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'

# Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Verify
\dx
# Should show: timescaledb

# Exit
\q
```

Or use Neon Console → SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### Step 2: Create DigitalOcean Droplet (3 min)

```bash
# Via DigitalOcean Dashboard:
1. Create → Droplets
2. Ubuntu 22.04 LTS
3. Basic Plan → 2GB RAM ($12/mo)
4. Choose region (closest to users)
5. Add SSH key
6. Create Droplet

# Note the IP address
```

### Step 3: Setup Droplet (5 min)

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install -y docker-compose git

# Clone your repo
cd /opt
git clone https://github.com/imsidkg/exness.git
cd exness/price-poller-be
```

### Step 4: Configure Environment (2 min)

```bash
# Create .env file
nano .env
```

Paste this (your Neon credentials are already filled in):

```bash
# Server
PORT=3001
WS_PORT=3002
NODE_ENV=production

# Neon Database (Already configured!)
DB_USER=neondb_owner
DB_HOST=ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech
DB_NAME=neondb
DB_PASSWORD=npg_1jYdoa8zexLt
DB_PORT=5432
DB_SSL=true

# Redis (Local)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your_super_secret_32_character_jwt_key_here

# CORS (Update after deploying frontend)
CORS_ORIGIN=http://localhost:5173
```

Save: Ctrl+X, Y, Enter

### Step 5: Deploy (2 min)

```bash
# Start services (Backend + Redis)
docker-compose -f docker-compose.prod.yml up -d --build

# Check if running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Look for:
# ✓ Connected to database
# ✓ Redis connected
# ✓ Server running on port 3001
# ✓ WebSocket server running

# Press Ctrl+C to exit logs
```

### Step 6: Configure Firewall (1 min)

```bash
# Allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Note: Don't expose 3001/3002 directly
# We'll use Nginx reverse proxy
```

---

## 🌐 Optional: Setup Domain & SSL (10 min)

### Configure DNS

```bash
# In your domain registrar:
# Add A records:
api.yourdomain.com → YOUR_DROPLET_IP
ws.yourdomain.com → YOUR_DROPLET_IP

# Wait 5-10 minutes for DNS propagation
```

### Setup Nginx & SSL

```bash
# Install Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
nano /etc/nginx/sites-available/exness
```

Paste this configuration:

```nginx
upstream backend_api {
    server localhost:3001;
}

upstream backend_ws {
    server localhost:3002;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name ws.yourdomain.com;

    location / {
        proxy_pass http://backend_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/exness /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificates
certbot --nginx -d api.yourdomain.com -d ws.yourdomain.com

# Follow prompts, choose to redirect HTTP to HTTPS
```

---

## 🎨 Deploy Frontend to Vercel (5 min)

```bash
# In your local machine, go to frontend folder
cd frontend

# Create .env.production
nano .env.production
```

```bash
# If using domain:
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://ws.yourdomain.com

# If using IP (for testing):
VITE_API_URL=http://YOUR_DROPLET_IP:3001
VITE_WS_URL=ws://YOUR_DROPLET_IP:3002
```

```bash
# Deploy to Vercel
vercel login
vercel --prod

# Or use Vercel Dashboard:
# 1. Import Git repository
# 2. Set root directory: frontend
# 3. Add environment variables from .env.production
# 4. Deploy
```

### Update CORS

```bash
# Back on your droplet
ssh root@YOUR_DROPLET_IP
cd /opt/exness/price-poller-be

# Update .env with your Vercel URL
nano .env
# Change CORS_ORIGIN to: https://your-app.vercel.app

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## ✅ Verification

### Test Backend

```bash
# Test API endpoint
curl http://YOUR_DROPLET_IP:3001/
# Or with domain:
curl https://api.yourdomain.com/

# Should return: "Hello from the price poller BE!"
```

### Test Redis

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
# Should return: PONG
```

### Test Database

```bash
# Check database tables
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "\dt"

# Should show your tables:
# - tickers
# - users
# - balances
# - trades
```

### Test Frontend

```bash
# Open your Vercel URL
# 1. Create an account
# 2. Login
# 3. Check if prices update (WebSocket working)
# 4. Try placing a trade
```

---

## 📊 Monitoring

### Check Services Status

```bash
# All services
docker-compose -f docker-compose.prod.yml ps

# Backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Redis logs
docker-compose -f docker-compose.prod.yml logs -f redis

# System resources
docker stats
```

### Check Neon Usage

```bash
# Via Neon Console:
1. Go to console.neon.tech
2. Select your project
3. View Metrics:
   - Storage usage
   - Compute time
   - Connection count
   - Query performance
```

---

## 🔄 Updates

### Update Backend Code

```bash
ssh root@YOUR_DROPLET_IP
cd /opt/exness/price-poller-be

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Update Frontend

```bash
# Just push to GitHub
git push origin main

# Vercel auto-deploys!
# Or manually: vercel --prod
```

---

## 💰 Cost Breakdown

| Service       | Cost       | Notes                  |
| ------------- | ---------- | ---------------------- |
| Neon Database | **$0/mo**  | Free tier (0.5GB)      |
| Redis         | **$0/mo**  | On Droplet             |
| Droplet (2GB) | **$12/mo** | Backend + Redis        |
| Vercel        | **$0/mo**  | Hobby tier             |
| **TOTAL**     | **$12/mo** | **$360/year savings!** |

---

## 🆘 Troubleshooting

### Backend Can't Connect to Neon

```bash
# Check environment variables
docker-compose exec backend env | grep DB_

# Test connection from droplet
apt-get install -y postgresql-client
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'

# Check logs
docker-compose logs backend | grep -i "database\|error"
```

### Redis Connection Failed

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis
docker-compose exec redis redis-cli ping

# Verify REDIS_HOST=redis (not localhost!)
cat .env | grep REDIS_HOST
```

### CORS Errors in Frontend

```bash
# Verify CORS_ORIGIN matches frontend URL exactly
cat .env | grep CORS_ORIGIN

# Should be: https://your-app.vercel.app
# (no trailing slash!)

# Restart backend
docker-compose restart backend
```

---

## 📚 Additional Guides

- **[NEON_SETUP.md](price-poller-be/NEON_SETUP.md)** - Detailed Neon configuration
- **[DEPLOYMENT_DROPLET.md](price-poller-be/DEPLOYMENT_DROPLET.md)** - Full Droplet setup
- **[REDIS_ON_INSTANCE.md](price-poller-be/REDIS_ON_INSTANCE.md)** - Redis configuration
- **[COST_ANALYSIS.md](COST_ANALYSIS.md)** - Detailed cost breakdown

---

## 🎉 Success!

Your trading platform is now live with:

✅ Neon PostgreSQL (Free!)  
✅ Redis on instance (Free!)  
✅ Backend deployed ($12/mo)  
✅ Frontend on Vercel (Free!)

**Total: $12/month** for a full production setup!

**Backend URL**: https://api.yourdomain.com  
**Frontend URL**: https://your-app.vercel.app

Start trading! 🚀
