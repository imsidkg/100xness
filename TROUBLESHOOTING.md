# Troubleshooting Checklist

Quick reference for debugging common production issues on the DigitalOcean droplet (`143.110.247.250`).

---

## 🔴 "Server Unreachable" / Backend Down

### 1. Check if Docker is running

```bash
ssh root@143.110.247.250 'docker ps -a'
```

- If you get `Cannot connect to the Docker daemon` → Docker crashed. Go to step 2.
- If containers show `Exited` → Skip to step 3.

### 2. Check disk space

```bash
ssh root@143.110.247.250 'df -h'
```

- **If `/dev/vda1` is at 100%** → Disk is full. This is the #1 cause of crashes.

  ```bash
  # Clear system journal logs
  ssh root@143.110.247.250 'journalctl --vacuum-time=1d'

  # Truncate Docker container logs (find the big one first)
  ssh root@143.110.247.250 'du -sh /var/lib/docker/containers/* | sort -rh | head -n 3'
  # Then truncate the largest log file:
  ssh root@143.110.247.250 'echo "" > /var/lib/docker/containers/<ID>/<ID>-json.log'

  # Prune unused Docker data
  ssh root@143.110.247.250 'docker system prune -af --volumes'

  # Start Docker
  ssh root@143.110.247.250 'systemctl start docker'
  ```

### 3. Restart containers

```bash
ssh root@143.110.247.250 'cd /root/exness/price-poller-be && docker compose -f docker-compose.prod.yml up -d'
```

### 4. Check backend logs

```bash
ssh root@143.110.247.250 'docker logs price-poller-be-backend-1 --tail 50'
```

Look for:

- `MISCONF Redis` → Redis can't write to disk (disk full again)
- `ECONNREFUSED` → Database or Redis not ready yet, wait a few seconds
- `no space left on device` → Disk full

---

## 🟡 "Live Price Not Available"

### 1. Verify prices are streaming from Binance

```bash
ssh root@143.110.247.250 'docker logs price-poller-be-backend-1 --tail 100 | grep "inserted batch"'
```

- If tickers are being inserted → Binance feed is working.
- If no output → WebSocket to Binance may be down. Restart the backend container.

### 2. Check for module double instantiation

```bash
# Make sure there are NO dynamic imports of tradeService
ssh root@143.110.247.250 'grep "await import" /root/exness/price-poller-be/src/controllers/tradeController.ts'
```

- If this returns ANY results → **This is the bug.** The dynamic `await import("../services/tradeService.js")` creates a second copy of the module in memory, splitting the price cache. Replace with static `import` at the top of the file.

### 3. Check that startPriceListener is being called

```bash
ssh root@143.110.247.250 'grep "startPriceListener" /root/exness/price-poller-be/src/server.ts | grep -v "//"'
```

- Should show `startPriceListener();` (not commented out).

### 4. Test with curl (from inside the droplet)

```bash
ssh root@143.110.247.250 'curl -s http://localhost:3001/'
```

- Should return `Hello from the price poller BE!`

---

## 🟠 "Internal Server Error" (500)

### 1. Check Redis health

```bash
ssh root@143.110.247.250 'docker logs price-poller-be-redis-1 --tail 20'
```

- Look for `No space left on device` or `Background saving error` → Disk is full. See disk cleanup steps above.

### 2. Check PostgreSQL health

```bash
ssh root@143.110.247.250 'docker logs price-poller-be-postgres-1 --tail 20'
```

### 3. Check backend error logs

```bash
ssh root@143.110.247.250 'docker logs price-poller-be-backend-1 --tail 100 | grep -i error'
```

---

## 🛡️ Prevention Checklist

| What                    | How                                                                | Status   |
| ----------------------- | ------------------------------------------------------------------ | -------- |
| Docker log rotation     | `logging: max-size: 10m, max-file: 3` in `docker-compose.prod.yml` | ✅ Added |
| No per-tick console.log | Don't log inside WebSocket message handlers                        | ✅ Fixed |
| Static imports only     | Never use `await import()` for in-memory singletons                | ✅ Fixed |
| Swap file size          | Keep at 2GB, not 11GB (saves 9GB disk)                             | ✅ Fixed |

---

## 🚀 Full Redeploy (Nuclear Option)

If nothing else works, wipe everything and start fresh:

```bash
ssh root@143.110.247.250 'cd /root/exness/price-poller-be && \
  docker compose -f docker-compose.prod.yml down -v && \
  docker system prune -af --volumes && \
  git pull origin main && \
  docker compose -f docker-compose.prod.yml build && \
  docker compose -f docker-compose.prod.yml up -d'
```

> ⚠️ **Warning:** This wipes the database (trades, users, balances). Only use as a last resort.
