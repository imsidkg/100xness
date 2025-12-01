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
docker-compose -f docker-compose.prod.yml down

# Start with PostgreSQL
echo "🏗️  Starting services with PostgreSQL..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait a bit
echo "⏳ Waiting for services to initialize..."
sleep 15

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "📋 View logs: docker-compose -f docker-compose.prod.yml logs -f"
