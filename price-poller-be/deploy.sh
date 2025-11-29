# Deployment Script for DigitalOcean
#!/bin/bash

echo "🚀 Starting deployment to DigitalOcean..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t exness-trading-backend:latest .

# Tag for registry (replace with your registry URL)
echo "🏷️  Tagging image..."
docker tag exness-trading-backend:latest registry.digitalocean.com/your-registry/exness-trading-backend:latest

# Push to registry
echo "⬆️  Pushing to DigitalOcean Container Registry..."
docker push registry.digitalocean.com/your-registry/exness-trading-backend:latest

echo "✅ Deployment complete!"
echo "🔗 Don't forget to:"
echo "   1. Update your Droplet to pull the new image"
echo "   2. Restart the containers"
echo "   3. Check logs for any issues"
