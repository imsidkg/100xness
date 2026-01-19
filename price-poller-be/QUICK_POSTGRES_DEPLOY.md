# Quick PostgreSQL Deployment Guide

## 🚀 Deploy PostgreSQL on Your Droplet (Copy-Paste Commands)

### Step 1: SSH into your droplet
```sh
ssh root@your_droplet_ip
```

### Step 2: Navigate to backend directory
```sh
cd /root/price-poller-be
```
(Or wherever your backend code is located)

### Step 3: Pull latest code
```sh
git pull origin main
```

### Step 4: Update environment variables
```sh
nano .env
```

**Required changes:**
- Change `DB_HOST` from NeonDB host to `postgres`
- Change `DB_USER` to `postgres`
- Change `DB_NAME` to `trading_db`
- Change `DB_SSL` to `false`
- Set a secure `DB_PASSWORD`
- Ensure `JWT_SECRET` is set

**Example .env:**
```env
DB_USER=postgres
DB_HOST=postgres
DB_NAME=trading_db
DB_PASSWORD=your_secure_password_123
DB_PORT=5432
DB_SSL=false

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

NODE_ENV=production
PORT=3001
WS_PORT=3002
JWT_SECRET=your_jwt_secret_min_32_chars_long
CORS_ORIGIN=https://100xness.imsidkg.me
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 5: Stop current services
```sh
docker-compose -f docker-compose.prod.yml down
```

### Step 6: Start services with PostgreSQL
```sh
docker-compose -f docker-compose.prod.yml up -d --build
```

### Step 7: Verify everything is running
```sh
docker-compose -f docker-compose.prod.yml ps
```

You should see:
- ✅ backend (running)
- ✅ postgres (running)
- ✅ redis (running)

### Step 8: Check logs
```sh
docker-compose -f docker-compose.prod.yml logs -f backend
```

Look for:
- ✅ `Database connected at: ...`
- ✅ `Database initialized`
- ✅ `WebSocket server is running...`

Press `Ctrl+C` to exit logs.

## ✅ Verification

### Test database connection
```sh
docker exec price-poller-be-postgres-1 psql -U postgres -d trading_db -c "SELECT NOW();"
```

### Check database size
```sh
docker exec price-poller-be-postgres-1 psql -U postgres -d trading_db -c "SELECT pg_size_pretty(pg_database_size('trading_db'));"
```

### List tables
```sh
docker exec price-poller-be-postgres-1 psql -U postgres -d trading_db -c "\dt"
```

## 🔧 Troubleshooting

### If backend can't connect to database:
```sh
# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend
```

### If you see "Connection terminated unexpectedly":
This should be fixed with local PostgreSQL! But if it persists:
```sh
# Restart all services
docker-compose -f docker-compose.prod.yml restart
```

### To start fresh (WARNING: deletes all data):
```sh
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📊 Monitoring

### View live logs (filtered):
```sh
docker-compose -f docker-compose.prod.yml logs -f backend | grep -v "Updating price for" | grep -v "Processing bid/ask"
```

### Check resource usage:
```sh
docker stats
```

### Check disk usage:
```sh
df -h
docker system df
```

## 🎉 Done!

Your backend is now running with:
- ✅ Local PostgreSQL with TimescaleDB
- ✅ No connection limits
- ✅ Better performance
- ✅ Full control over the database

Test your API at: `https://api100xness.imsidkg.me`

## 🔄 To Rollback to NeonDB

If you need to go back to NeonDB:

1. Update `.env` back to NeonDB settings
2. Run:
```sh
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```
