# Deploying PostgreSQL on DigitalOcean Droplet

## Overview
This guide will help you migrate from NeonDB to a self-hosted PostgreSQL (with TimescaleDB) on your DigitalOcean droplet.

## Steps to Deploy

### 1. Update Environment Variables on Droplet

SSH into your droplet:
```sh
ssh root@your_droplet_ip
```

Navigate to your project directory:
```sh
cd /root/price-poller-be  # or wherever your backend is
```

Edit the `.env` file (or create it if it doesn't exist):
```sh
nano .env
```

Add/Update these variables:
```env
# Database Configuration (Local PostgreSQL)
DB_USER=postgres
DB_HOST=postgres
DB_NAME=trading_db
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_PORT=5432
DB_SSL=false

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

# Application
NODE_ENV=production
PORT=3001
WS_PORT=3002
JWT_SECRET=YOUR_JWT_SECRET_HERE
CORS_ORIGIN=https://100xness.imsidkg.me
```

**Important:** Replace `YOUR_SECURE_PASSWORD_HERE` and `YOUR_JWT_SECRET_HERE` with secure random strings!

### 2. Pull Latest Code from GitHub

```sh
git pull origin main
```

### 3. Stop Current Services

```sh
docker-compose -f docker-compose.prod.yml down
```

### 4. Start Services with PostgreSQL

```sh
docker-compose -f docker-compose.prod.yml up -d --build
```

This will:
- Create a PostgreSQL container with TimescaleDB
- Create a persistent volume for database data
- Start your backend connected to the local PostgreSQL

### 5. Verify Services are Running

```sh
docker-compose -f docker-compose.prod.yml ps
```

You should see three services running:
- `backend` 
- `postgres`
- `redis`

### 6. Check Logs

```sh
# Check all logs
docker-compose -f docker-compose.prod.yml logs -f

# Check only backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Check only database logs
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 7. Verify Database Connection

The backend should automatically:
- Connect to PostgreSQL
- Create all necessary tables
- Create TimescaleDB hypertables
- Create materialized views

Check backend logs for messages like:
- `✅ Database connected at: ...`
- `Database initialized`

## Data Migration (Optional)

If you want to migrate existing data from NeonDB to local PostgreSQL:

### Option 1: Export/Import via pg_dump

On your local machine (or droplet):
```sh
# Export from NeonDB
pg_dump -h ep-wispy-shadow-a4u4vn6o-pooler.us-east-1.aws.neon.tech \
  -U neondb_owner \
  -d neondb \
  --no-owner --no-acl \
  -f neon_backup.sql

# Import to local PostgreSQL (from droplet)
docker exec -i price-poller-be-postgres-1 psql -U postgres -d trading_db < neon_backup.sql
```

### Option 2: Start Fresh

If you don't need old data, just let the backend initialize a fresh database. All tables will be created automatically.

## Troubleshooting

### Backend can't connect to database

Check if PostgreSQL is running:
```sh
docker-compose -f docker-compose.prod.yml ps postgres
```

Check PostgreSQL logs:
```sh
docker-compose -f docker-compose.prod.yml logs postgres
```

### Database initialization fails

Restart the backend service:
```sh
docker-compose -f docker-compose.prod.yml restart backend
```

### Port conflicts

If port 5432 is already in use on your droplet, you can either:
1. Stop the conflicting service
2. Change the PostgreSQL port in docker-compose (not recommended as it requires more changes)

## Backup Strategy

### Automated Backups

Create a backup script (`/root/backup-db.sh`):
```sh
#!/bin/bash
BACKUP_DIR="/root/db-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/trading_db_$DATE.sql"

mkdir -p $BACKUP_DIR

docker exec price-poller-be-postgres-1 pg_dump -U postgres trading_db > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make it executable:
```sh
chmod +x /root/backup-db.sh
```

Schedule daily backups with cron:
```sh
crontab -e
```

Add this line:
```
0 2 * * * /root/backup-db.sh >> /root/backup.log 2>&1
```

This will backup your database daily at 2 AM.

## Performance Benefits

With local PostgreSQL, you'll get:
- ✅ No connection limits
- ✅ Lower latency (local network)
- ✅ Better connection pooling
- ✅ Full control over database configuration
- ✅ No external service dependencies
- ✅ Better performance for high-frequency operations

## Monitoring

Check PostgreSQL resource usage:
```sh
docker stats price-poller-be-postgres-1
```

Check database size:
```sh
docker exec price-poller-be-postgres-1 psql -U postgres -d trading_db -c "SELECT pg_size_pretty(pg_database_size('trading_db'));"
```

## Rollback to NeonDB (if needed)

If you need to rollback:

1. Stop services:
```sh
docker-compose -f docker-compose.prod.yml down
```

2. Update `.env` back to NeonDB settings
3. Start services:
```sh
docker-compose -f docker-compose.prod.yml up -d --build
```

## Questions?

If you encounter any issues, check:
1. Docker logs: `docker-compose -f docker-compose.prod.yml logs`
2. Backend logs: Look for database connection errors
3. PostgreSQL logs: Look for authentication or startup errors
