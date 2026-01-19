# Manual PostgreSQL Deployment (Step-by-Step)

If the automatic script fails, follow these manual steps.

## Step 1: Stop Current Services

```bash
cd /root/price-poller-be  # Or your backend path
docker compose -f docker-compose.prod.yml down
```

## Step 2: Pull Latest Code

```bash
git pull origin main
```

## Step 3: Start PostgreSQL and Redis Only

```bash
docker compose -f docker-compose.prod.yml up -d postgres redis
```

## Step 4: Wait for PostgreSQL to Be Ready

Wait 20-30 seconds, then check:

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U tradinguser
```

You should see: `postgres:5432 - accepting connections`

If not, wait another 10 seconds and try again.

## Step 5: Check PostgreSQL Logs (Optional)

```bash
docker compose -f docker-compose.prod.yml logs postgres
```

Look for: `database system is ready to accept connections`

## Step 6: Start Backend

```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

## Step 7: Wait for Backend to Start

Wait 10-15 seconds, then check logs:

```bash
docker compose -f docker-compose.prod.yml logs backend | tail -50
```

Look for:
- ✅ `✅ Database connected at: ...`
- ✅ `Database initialized`
- ✅ `WebSocket server is running...`

## Step 8: Verify All Services Are Running

```bash
docker compose -f docker-compose.prod.yml ps
```

All three services should show "Up":
- backend
- postgres  
- redis

## Step 9: Test Your API

```bash
curl https://api100xness.imsidkg.me/health
```

---

## If Backend Shows "Unhealthy" or Won't Start

### Check Backend Logs for Errors

```bash
docker compose -f docker-compose.prod.yml logs backend
```

Common issues:

### 1. Database Connection Error

**Symptom:** `ECONNREFUSED` or `Connection terminated unexpectedly`

**Fix:**
```bash
# Restart PostgreSQL
docker compose -f docker-compose.prod.yml restart postgres

# Wait 10 seconds
sleep 10

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### 2. Environment Variables Not Set

**Symptom:** `JWT_SECRET variable is not set` or `CORS_ORIGIN variable is not set`

**Fix:** These now have defaults, but you can set them:

```bash
# Create .env file
nano .env
```

Add:
```env
JWT_SECRET=your_secure_jwt_secret_min_32_chars
CORS_ORIGIN=https://100xness.imsidkg.me
```

Then restart:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### 3. Port Already in Use

**Symptom:** `port is already allocated`

**Fix:** Find what's using the port and stop it:

```bash
# Check what's using port 3001
sudo lsof -i :3001

# Stop that process or change the port in docker-compose
```

### 4. Out of Disk Space

**Symptom:** `no space left on device`

**Fix:**
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

---

## Complete Reset (Last Resort)

**WARNING: This deletes all data!**

```bash
# Stop and remove everything including volumes
docker compose -f docker-compose.prod.yml down -v

# Remove any orphaned containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Start fresh
docker compose -f docker-compose.prod.yml up -d --build
```

Wait 30 seconds, then check:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend
```

---

## Verify Database is Working

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U tradinguser -d trading_db

# Run a test query
SELECT NOW();

# List tables
\dt

# Exit
\q
```

You should see tables like: `users`, `balances`, `trades`, `tickers`

---

## Success Checklist

✅ PostgreSQL is accepting connections
✅ Backend logs show "Database connected"
✅ Backend logs show "Database initialized"
✅ Backend logs show "WebSocket server is running"
✅ All three containers are "Up" in `docker compose ps`
✅ API responds at https://api100xness.imsidkg.me

If all above are true, you're good to go! 🎉
