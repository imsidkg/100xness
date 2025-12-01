#!/bin/bash
# One-command deployment script for PostgreSQL migration

set -e

echo "🚀 Deploying PostgreSQL on DigitalOcean Droplet..."
echo ""

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Stop current services
echo "⏹️  Stopping services..."
docker compose -f docker-compose.prod.yml down

# Start PostgreSQL and Redis first
echo "🗄️  Starting PostgreSQL and Redis..."
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
echo "🔍 Checking PostgreSQL health..."
for i in {1..30}; do
  if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U tradinguser > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  echo "   Waiting... ($i/30)"
  sleep 2
done

# Start backend
echo "🏗️  Starting backend..."
docker compose -f docker-compose.prod.yml up -d --build backend

# Wait a bit for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 10

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo "📋 View logs: docker compose -f docker-compose.prod.yml logs -f backend"
