# Quick Deployment Checklist

## ✅ Pre-Deployment

### Backend Changes

- [x] Created `.env.example` and `.env.production`
- [x] Updated `src/config/db.ts` to use environment variables
- [x] Updated `src/lib/redisClient.ts` to use environment variables
- [x] Updated `src/server.ts` to use PORT and CORS from env
- [x] Updated `src/websockets/websocketServer.ts` to use WS_PORT from env
- [x] Created `Dockerfile` for containerization
- [x] Created `docker-compose.yml` for local testing
- [x] Created `.dockerignore`

### Frontend Changes

- [x] Created `.env.example` and `.env.production`
- [x] Created `src/config/api.ts` for centralized API configuration
- [x] Updated all API calls in components to use config
- [x] Created `vercel.json` for Vercel deployment
- [x] Created `.dockerignore`

## 🚀 Deployment Steps

### 1. Backend to DigitalOcean

#### Setup Databases

```bash
# Create PostgreSQL cluster with TimescaleDB
# Create Redis cluster
# Note connection details
```

#### Deploy Backend

```bash
cd price-poller-be

# Copy and update environment file
cp .env.production .env
# Edit .env with your database credentials

# Option A: App Platform
doctl apps create --spec app.yaml

# Option B: Droplet
ssh root@your-droplet
git clone your-repo
cd price-poller-be
docker build -t exness-backend .
docker run -d --env-file .env -p 3001:3001 -p 3002:3002 exness-backend
```

### 2. Frontend to Vercel

```bash
cd frontend

# Update .env.production with your backend URLs
# VITE_API_URL=https://your-backend-url.com
# VITE_WS_URL=wss://your-backend-url.com

# Deploy
vercel --prod
```

### 3. Update CORS

```bash
# Update backend CORS_ORIGIN to match your Vercel URL
# Restart backend service
```

### 4. Test

- [ ] Frontend loads
- [ ] Can create account
- [ ] Can login
- [ ] Prices update in real-time (WebSocket working)
- [ ] Can place trades
- [ ] Trades appear in dashboard

## 📝 Important URLs

**Backend:**

- API: `https://your-backend-url.com`
- WebSocket: `wss://your-backend-url.com`
- Health: `https://your-backend-url.com/`

**Frontend:**

- App: `https://your-frontend.vercel.app`

**Databases:**

- PostgreSQL: `your-db.db.ondigitalocean.com:25060`
- Redis: `your-redis.db.ondigitalocean.com:25061`

## 🔧 Common Issues

### CORS Error

```bash
# Update CORS_ORIGIN in backend .env
# Restart backend
```

### WebSocket Not Connecting

```bash
# Check firewall allows port 3002
# Check WS_URL uses wss:// (not ws://)
# Check Nginx WebSocket proxy config
```

### Database Connection Failed

```bash
# Verify DB_SSL=true
# Check connection string format
# Verify firewall/VPC settings
# Check credentials
```

## 📊 Monitoring

```bash
# Backend logs
docker logs -f exness-backend

# App Platform logs
doctl apps logs <app-id> --follow

# Database metrics
# Check DigitalOcean Dashboard → Databases → Metrics
```

## 🔄 Updates

```bash
# Backend update
git pull
docker build -t exness-backend .
docker restart exness-backend

# Frontend update
git push origin main  # Auto-deploys via Vercel
```

## 💰 Cost Estimate

- Droplet (2GB): $12/mo
- PostgreSQL Dev: $15/mo
- Redis: $15/mo
- Vercel Pro: $20/mo
- **Total**: ~$62/mo

## 🆘 Support Resources

- [DigitalOcean Docs](https://docs.digitalocean.com/)
- [Vercel Docs](https://vercel.com/docs)
- [TimescaleDB Docs](https://docs.timescale.com/)
- Full guide: See `DEPLOYMENT.md`
