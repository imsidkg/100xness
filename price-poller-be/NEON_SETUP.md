# 🚀 Neon Database Setup Guide

## What is Neon?

Neon is a serverless PostgreSQL platform with:

- ✅ **Free tier**: 0.5GB storage, 10GB data transfer
- ✅ **Serverless**: Auto-scaling, pay-per-use
- ✅ **Fast**: Built on cloud-native architecture
- ✅ **Easy**: No server management needed
- ✅ **PostgreSQL compatible**: Full PostgreSQL support

## 📋 Your Neon Configuration

**Connection String:**

```
postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Parsed Details:**

- **Username**: `neondb_owner`
- **Password**: `npg_1jYdoa8zexLt`
- **Host**: `ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech`
- **Database**: `neondb`
- **Port**: `5432` (default PostgreSQL)
- **SSL Mode**: `require`

---

## ✅ Environment Configuration

Your `.env.production` has been updated:

```bash
# Database Configuration (Neon PostgreSQL)
DB_USER=neondb_owner
DB_HOST=ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech
DB_NAME=neondb
DB_PASSWORD=npg_1jYdoa8zexLt
DB_PORT=5432
DB_SSL=true
```

---

## 🔧 Enable TimescaleDB on Neon

Neon supports TimescaleDB extension. Here's how to enable it:

### Method 1: Using Neon Console (Easiest)

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to **SQL Editor**
4. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS timescaledb;
   ```

### Method 2: Using psql

```bash
# Connect to your Neon database
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'

# Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Verify
\dx

# You should see timescaledb in the list
# Exit
\q
```

### Method 3: Using Database Init Script

The extension will be automatically enabled when your backend runs the database initialization script (`src/db/init.ts`).

---

## 🏗️ Initialize Database Schema

Your application should automatically initialize the schema on first run, but you can also do it manually:

### Option 1: Automatic (Recommended)

The schema will be created when you start your backend:

```bash
docker-compose -f docker-compose.prod.yml up -d
# Check logs
docker-compose logs backend | grep -i "database\|initialized"
```

### Option 2: Manual Initialization

```bash
# Using psql
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' < src/db/init.sql

# Or connect and paste SQL commands
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
```

Then run your initialization queries from `src/db/init.ts`.

---

## 💰 Neon Cost Comparison

### Previous (DigitalOcean Managed PostgreSQL)

- Development: **$15/month**
- Production: **$60/month**

### Now (Neon)

- Free Tier: **$0/month** (0.5GB storage)
- Pro: **$19/month** (10GB storage, unlimited compute)
- Scale: **$69/month** (50GB storage, autoscaling)

**For MVP/Development: FREE! 🎉**

### Updated Total Costs

| Component | Before           | After (Neon Free) | Savings    |
| --------- | ---------------- | ----------------- | ---------- |
| Database  | $15/mo           | **$0/mo**         | **$15/mo** |
| Redis     | $0 (on instance) | $0 (on instance)  | -          |
| Backend   | $12/mo (Droplet) | $12/mo (Droplet)  | -          |
| **Total** | **$27/mo**       | **$12/mo**        | **$15/mo** |

**Monthly savings: $15**  
**Annual savings: $180** 🚀

---

## 🔐 Security Considerations

### Connection Pooling

Neon uses **connection pooling** by default (notice `-pooler` in hostname). This is perfect for serverless/Docker deployments.

**Pooler endpoint** (what you're using):

```
ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech
```

**Direct endpoint** (for migrations/admin tasks):

```
ep-wispy-shadow-a4u4vn6o.us-east-1.aws.neon.tech
```

💡 **Keep using the pooler endpoint** for your application.

### Password Security

⚠️ **Important**: Your database password is visible in this document.

**Recommended actions:**

1. **Rotate password** (in Neon console):

   - Go to Neon Console → Project Settings → Reset Password
   - Update `.env` files with new password

2. **Use environment variables** (already configured):

   - Never commit `.env` with real credentials
   - `.env` is gitignored ✓

3. **Restrict access** (in Neon console):
   - Go to Project Settings → IP Allow List
   - Add your Droplet's IP address

---

## 🚀 Deployment with Neon

### Updated docker-compose.prod.yml

Your current setup already works with Neon! Just ensure your `.env` has the correct values:

```bash
cd price-poller-be

# Verify .env has Neon credentials
cat .env | grep DB_

# Should show:
# DB_USER=neondb_owner
# DB_HOST=ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech
# DB_NAME=neondb
# DB_PASSWORD=npg_1jYdoa8zexLt
# DB_PORT=5432
# DB_SSL=true

# Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Check connection
docker-compose logs backend | grep -i "connected\|database"
```

---

## 🔍 Monitoring & Management

### Neon Console Features

Access at [console.neon.tech](https://console.neon.tech):

1. **SQL Editor**: Run queries directly
2. **Metrics**: Monitor database usage
3. **Branching**: Create database branches (like git!)
4. **Backups**: Automatic point-in-time recovery
5. **Monitoring**: Query performance, connections

### Query Your Database

```bash
# Quick connection
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'

# Common queries
SELECT version();  # PostgreSQL version
\dt                # List tables
\d+ tickers        # Describe tickers table
SELECT COUNT(*) FROM tickers;  # Count records
```

### Check TimescaleDB

```sql
-- Check if TimescaleDB is installed
SELECT * FROM pg_extension WHERE extname = 'timescaledb';

-- Check hypertables
SELECT * FROM timescaledb_information.hypertables;

-- Check TimescaleDB version
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';
```

---

## 📊 Performance Tips

### Connection Pooling

Neon's pooler handles connections automatically. Your app config is optimal:

```typescript
// src/config/db.ts
export const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Query Optimization

```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickers_time ON tickers (time DESC);
CREATE INDEX IF NOT EXISTS idx_tickers_symbol ON tickers (symbol);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades (user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades (status);
```

### TimescaleDB Compression

```sql
-- Enable compression on tickers (saves storage)
ALTER TABLE tickers SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol'
);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('tickers', INTERVAL '7 days');
```

---

## 🔄 Migration from DigitalOcean (if needed)

If you had data in DigitalOcean and want to migrate:

### Export from DigitalOcean

```bash
pg_dump "postgresql://doadmin:PASSWORD@your-old-db.db.ondigitalocean.com:25060/defaultdb?sslmode=require" > backup.sql
```

### Import to Neon

```bash
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' < backup.sql
```

---

## 🆘 Troubleshooting

### Connection Timeout

```bash
# Check if host is reachable
ping ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech

# Check SSL
curl https://ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech

# Try direct connection
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
```

### SSL Errors

Ensure `DB_SSL=true` in your `.env`:

```typescript
// src/config/db.ts should have:
ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;
```

### Too Many Connections

Neon free tier limits:

- **Max connections**: 100 (pooled)
- **Max storage**: 0.5GB

If exceeded, consider:

1. Upgrade to Pro plan
2. Optimize connection pool size
3. Close idle connections

### Database Not Found

```bash
# List available databases
psql 'postgresql://neondb_owner:npg_1jYdoa8zexLt@ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "\l"

# Create database if needed (usually already exists)
CREATE DATABASE neondb;
```

---

## 📈 Scaling with Neon

### Free Tier Limits

- 0.5GB storage
- 10GB data transfer/month
- 100 hours of compute/month
- Automatic suspend after 5 minutes of inactivity

### When to Upgrade

Upgrade to **Pro ($19/mo)** when:

- Storage exceeds 0.5GB
- Need more than 100 compute hours
- Want instant wake-up (no cold starts)
- Need autoscaling

### Neon Branching (Powerful Feature!)

```bash
# Create a branch (like git branch)
# Great for testing without affecting production

# 1. Via Neon Console:
# Go to Branches → Create Branch → "staging"

# 2. Get staging connection string
# Use it in .env.staging

# Deploy staging:
docker-compose -f docker-compose.staging.yml up -d
```

---

## ✅ Updated Deployment Checklist

- [x] Neon database created
- [x] Connection string obtained
- [x] `.env.production` updated with Neon credentials
- [ ] TimescaleDB extension enabled
- [ ] Database schema initialized
- [ ] Backend deployed and connected
- [ ] Indexes created for performance
- [ ] Monitoring setup in Neon Console
- [ ] Consider password rotation
- [ ] Consider IP allowlist (optional)

---

## 🎉 Benefits of Using Neon

✅ **Cost**: Free tier perfect for MVP ($15/mo savings)  
✅ **Serverless**: Auto-scales, no server management  
✅ **Fast**: Global edge network, low latency  
✅ **Branching**: Database branches for dev/staging  
✅ **Backups**: Automatic point-in-time recovery  
✅ **PostgreSQL**: Full compatibility with TimescaleDB  
✅ **Developer-friendly**: Great console and API

---

## 📚 Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon + TimescaleDB Guide](https://neon.tech/docs/extensions/timescaledb)
- [Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
- [Neon Pricing](https://neon.tech/pricing)

---

**Your database is now running on Neon! Deploy and save $15/month! 🚀**
