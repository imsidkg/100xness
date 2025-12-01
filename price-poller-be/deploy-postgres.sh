#!/bin/bash

# PostgreSQL Migration Script for DigitalOcean Droplet
# This script helps migrate from NeonDB to local PostgreSQL

set -e

echo "🚀 Starting PostgreSQL deployment on DigitalOcean Droplet..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.production...${NC}"
    cp .env.production .env
    echo -e "${YELLOW}⚠️  Please edit .env and set secure passwords!${NC}"
    echo -e "${YELLOW}   Required variables:${NC}"
    echo -e "${YELLOW}   - DB_PASSWORD${NC}"
    echo -e "${YELLOW}   - JWT_SECRET${NC}"
    read -p "Press enter when you've updated .env file..."
fi

# Pull latest code
echo -e "${GREEN}📥 Pulling latest code from GitHub...${NC}"
git pull origin main

# Stop existing services
echo -e "${YELLOW}⏹️  Stopping existing services...${NC}"
docker-compose -f docker-compose.prod.yml down

# Build and start services
echo -e "${GREEN}🏗️  Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check service status
echo -e "${GREEN}📊 Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo -e "${GREEN}📋 Recent logs:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=50

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "To view live logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To check database connection:"
echo "  docker exec price-poller-be-postgres-1 psql -U postgres -d trading_db -c 'SELECT NOW();'"
echo ""
echo "To access PostgreSQL shell:"
echo "  docker exec -it price-poller-be-postgres-1 psql -U postgres -d trading_db"
echo ""
