# 🚀 Deploy PostgreSQL - Simple 3-Step Guide

## What's Changed
- ✅ Added PostgreSQL with TimescaleDB to Docker Compose
- ✅ Removed dependency on NeonDB (no more connection issues!)
- ✅ All credentials pre-configured (no manual setup needed)
- ✅ Database data persisted in Docker volume

## Credentials (Auto-configured)
```
Database User: tradinguser
Database Password: Trading@2024!Secure
Database Name: trading_db
```
These are already set in the docker-compose file, you don't need to do anything!

---

## 🎯 Deployment Steps

### Step 1: SSH into your droplet
```bash
ssh root@your_droplet_ip
```

### Step 2: Navigate to backend directory
```bash
cd /root/price-poller-be
```
(Replace with your actual path if different)

### Step 3: Run the deployment script
```bash
chmod +x deploy-with-postgres.sh
./deploy-with-postgres.sh
```

**That's it!** The script will:
1. Pull latest code from GitHub
2. Stop current services
3. Start services with PostgreSQL
4. Show you the status

---

## ✅ Verify It's Working

After deployment, check the logs:
```bash
docker-compose -f docker-compose.prod.yml logs backend | tail -50
```

Look for these success messages:
- ✅ `✅ Database connected at: ...`
- ✅ `Database initialized`
- ✅ `WebSocket server is running...`

Check if all services are running:
```bash
docker-compose -f docker-compose.prod.yml ps
```

You should see:
- `backend` - Up
- `postgres` - Up
- `redis` - Up

---

## 🧪 Test Your API

Your API should now work without the "Connection terminated unexpectedly" error!

Test the problematic endpoint:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api100xness.imsidkg.me/api/v1/user/account-summary
```

---

## 📊 Useful Commands

### View live logs (filtered to remove noise):
```bash
docker-compose -f docker-compose.prod.yml logs -f backend | grep -v "Updating price" | grep -v "Processing bid"
```

### Access PostgreSQL shell:
```bash
docker exec -it price-poller-be-postgres-1 psql -U tradinguser -d trading_db
```

### Check database size:
```bash
docker exec price-poller-be-postgres-1 psql -U tradinguser -d trading_db -c "SELECT pg_size_pretty(pg_database_size('trading_db'));"
```

### Restart services:
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop services:
```bash
docker-compose -f docker-compose.prod.yml down
```

### Start services:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Troubleshooting

### If you see "Container is unhealthy" error:

This usually means PostgreSQL is still starting. Try this:

```bash
# Stop everything
docker compose -f docker-compose.prod.yml down

# Start PostgreSQL first
docker compose -f docker-compose.prod.yml up -d postgres

# Wait 20 seconds
sleep 20

# Check if PostgreSQL is ready
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U tradinguser

# If it says "accepting connections", start backend
docker compose -f docker-compose.prod.yml up -d backend
```

### If backend won't start:
```bash
docker compose -f docker-compose.prod.yml logs backend
```

### If PostgreSQL won't start:
```bash
docker compose -f docker-compose.prod.yml logs postgres
```

### To completely reset (WARNING: deletes all data):
```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 💾 Data Persistence

Your database data is stored in a Docker volume named `price-poller-be_postgres_data`. 

This means:
- ✅ Data survives container restarts
- ✅ Data survives container rebuilds
- ❌ Data is deleted only if you run `docker-compose down -v`

To backup your database:
```bash
docker exec price-poller-be-postgres-1 pg_dump -U tradinguser trading_db > backup.sql
```

To restore:
```bash
docker exec -i price-poller-be-postgres-1 psql -U tradinguser -d trading_db < backup.sql
```

---

## 🎉 Benefits

With local PostgreSQL, you now have:
- ✅ **No connection limits** - Handle unlimited concurrent connections
- ✅ **Lower latency** - Database on same machine as backend
- ✅ **Better reliability** - No dependency on external services
- ✅ **Full control** - Tune database settings as needed
- ✅ **Cost savings** - No external database fees

---

## 📞 Need Help?

If something doesn't work:
1. Check the logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify all containers are running: `docker-compose -f docker-compose.prod.yml ps`
3. Check disk space: `df -h`
4. Restart services: `docker-compose -f docker-compose.prod.yml restart`
