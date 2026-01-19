# 📋 Quick Start Summary: Redis on Instance

## What Changed?

**Before**: Redis as a separate managed service ($15/mo)  
**After**: Redis runs on the same instance as your backend ($0 extra cost)

## Benefits

✅ **Save $15/month** - No managed Redis cost  
✅ **Simpler setup** - One less service to configure  
✅ **Faster** - Redis on localhost (no network latency)  
✅ **Secure** - Redis not exposed externally  
✅ **Auto-backup** - Included in Docker volume

## How It Works

```
┌─────────────────────────────────────┐
│     DigitalOcean Droplet/App        │
│  ┌───────────────────────────────┐  │
│  │   Docker Network              │  │
│  │                               │  │
│  │  ┌──────────┐  ┌───────────┐ │  │
│  │  │ Backend  │  │   Redis   │ │  │
│  │  │  :3001   │◄─┤   :6379   │ │  │
│  │  │  :3002   │  │           │ │  │
│  │  └──────────┘  └───────────┘ │  │
│  └───────────────────────────────┘  │
│          │                          │
│  ┌───────▼──────────────────────┐   │
│  │  External PostgreSQL         │   │
│  │  (DigitalOcean Managed)      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Updated Configuration

### Environment Variables (.env.production)

```bash
# Before (Managed Redis)
REDIS_HOST=your-redis.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=strong_password
REDIS_TLS=true

# After (Local Redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

### Docker Compose (docker-compose.prod.yml)

```yaml
services:
  backend:
    # ... backend config
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    # No external port exposure = secure!
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
cd price-poller-be
docker-compose -f docker-compose.prod.yml up -d --build
```

This automatically starts both backend and Redis together.

### Option 2: Separate Containers

```bash
# Start Redis
docker run -d \
  --name redis \
  --network app-network \
  -v redis_data:/data \
  redis:7-alpine

# Start Backend
docker run -d \
  --name backend \
  --network app-network \
  -e REDIS_HOST=redis \
  -p 3001:3001 \
  -p 3002:3002 \
  exness-backend
```

## Files Updated

### New Files

- `docker-compose.prod.yml` - Production compose file with Redis
- `DEPLOYMENT_DROPLET.md` - Detailed droplet deployment guide

### Modified Files

- `.env.production` - Redis config updated
- `.env.example` - Redis config updated
- `DEPLOYMENT.md` - Updated for Redis on instance
- `README_DEPLOYMENT.md` - Cost estimates updated

## Quick Deployment Steps

1. **Setup PostgreSQL** (managed)

   ```bash
   # Create in DigitalOcean dashboard
   # Note connection details
   ```

2. **Create Droplet**

   ```bash
   # 2GB RAM, $12/mo
   # Install Docker & Docker Compose
   ```

3. **Deploy with Docker Compose**

   ```bash
   git clone your-repo
   cd price-poller-be
   # Create .env with updated Redis config
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

4. **Verify**

   ```bash
   # Check Redis
   docker-compose exec redis redis-cli ping
   # Should return: PONG

   # Check backend logs
   docker-compose logs -f backend
   ```

## Cost Comparison

| Component  | Managed Redis | Local Redis | Savings    |
| ---------- | ------------- | ----------- | ---------- |
| PostgreSQL | $15/mo        | $15/mo      | -          |
| Redis      | $15/mo        | $0/mo       | **$15/mo** |
| Droplet    | $12/mo        | $12/mo      | -          |
| **Total**  | **$42/mo**    | **$27/mo**  | **$15/mo** |

**Annual Savings: $180!** 🎉

## Redis Data Persistence

### Backup

```bash
# Manual backup
docker-compose exec redis redis-cli BGSAVE

# Copy backup file
docker cp exness-redis:/data/dump.rdb ./backup_$(date +%Y%m%d).rdb
```

### Restore

```bash
# Stop Redis
docker-compose stop redis

# Copy backup to volume
docker cp backup.rdb exness-redis:/data/dump.rdb

# Restart
docker-compose start redis
```

## Monitoring Redis

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Inside Redis CLI:
INFO              # Server info
PING              # Test connection
DBSIZE            # Number of keys
KEYS *            # List all keys (dev only!)
MONITOR           # Watch commands in real-time
```

## Scaling Considerations

### When to Use Managed Redis

Consider managed Redis if you need:

- High availability (99.99% uptime)
- Automatic failover
- Multi-region replication
- More than 2GB RAM for Redis
- Team needs managed backups

### Current Setup is Perfect For

✅ MVP / Development
✅ Low to medium traffic
✅ Single region deployment
✅ Cost-conscious startups
✅ Up to ~10,000 active users

## Troubleshooting

### Redis Connection Failed

```bash
# Check Redis is running
docker-compose ps redis

# Check logs
docker-compose logs redis

# Verify hostname (must be 'redis' in Docker network)
echo $REDIS_HOST  # Should be 'redis', not 'localhost'
```

### Out of Memory

```bash
# Check Redis memory usage
docker-compose exec redis redis-cli INFO memory

# Increase Droplet RAM if needed
# Upgrade to 4GB ($24/mo) or 8GB ($48/mo)
```

### Data Not Persisting

```bash
# Check volume exists
docker volume ls | grep redis

# Check AOF is enabled
docker-compose exec redis redis-cli CONFIG GET appendonly
# Should return: appendonly yes
```

## Security Notes

✅ Redis not exposed externally (no port mapping)  
✅ Only accessible within Docker network  
✅ Optional: Add password protection  
✅ Data encrypted at rest (volume encryption)

### Add Password (Optional)

```yaml
# docker-compose.prod.yml
redis:
  command: redis-server --requirepass YOUR_PASSWORD --appendonly yes

# .env
REDIS_PASSWORD=YOUR_PASSWORD
```

## Next Steps

1. Read [DEPLOYMENT_DROPLET.md](DEPLOYMENT_DROPLET.md) for full guide
2. Update your `.env.production` file
3. Deploy using `docker-compose.prod.yml`
4. Test Redis connection
5. Deploy frontend with updated backend URLs

---

**Redis on instance = Simple, fast, and $15/mo cheaper!** 🚀
