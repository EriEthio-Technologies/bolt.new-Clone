#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ "$NODE_ENV" != "production" ]; then
  source .env.local
else
  source .env.production
fi

# Validate environment variables
echo "🔍 Validating environment variables..."
npm run validate-env

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Build application
echo "🏗️ Building application..."
npm run build

# Deploy to GCP
echo "🚀 Deploying to GCP..."
gcloud app deploy app.yaml --quiet

# Verify deployment
echo "✅ Verifying deployment..."
gcloud app browse

echo "🔐 Deploying API Gateway..."
gcloud endpoints services deploy openapi.yaml

echo "🔑 Configuring API keys..."
gcloud services enable apikeys.googleapis.com
gcloud alpha services api-keys create --display-name="Gobeze AI API Keys"

echo "📊 Setting up monitoring..."
gcloud monitoring dashboards create --dashboard-json-file=k8s/monitoring/api-dashboard.yaml

echo "⏰ Setting up key rotation..."
kubectl apply -f k8s/jobs/key-rotation.yaml

echo "🎉 Deployment complete!" 