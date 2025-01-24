#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | xargs)
fi

# Check required environment variables
required_vars=(
    "GCP_PROJECT_ID"
    "REDIS_URL"
    "AT_PROTOCOL_HEALTH_USER"
    "AT_PROTOCOL_HEALTH_PASS"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set"
        exit 1
    fi
done

echo "🔍 Running pre-deployment checks..."
npm run pre-deploy

echo "📦 Building application..."
npm run build

echo "🚀 Deploying to GCP..."
gcloud config set project $GCP_PROJECT_ID

# Apply monitoring configuration
echo "📊 Setting up monitoring..."
gcloud monitoring dashboards create --config-from-file=deploy/gcp/monitoring.yaml

# Deploy the application
echo "🌐 Deploying application..."
gcloud app deploy deploy/gcp/app.yaml --quiet

# Wait for deployment and verify health
echo "🏥 Verifying deployment..."
sleep 30  # Wait for deployment to stabilize

APP_URL=$(gcloud app browse --no-launch-browser)
HEALTH_CHECK=$(curl -s "${APP_URL}/health")

if [[ $HEALTH_CHECK == *"\"status\":\"healthy\""* ]]; then
    echo "✅ Deployment successful and healthy!"
else
    echo "❌ Health check failed!"
    echo $HEALTH_CHECK
    exit 1
fi

echo "
Deployment completed successfully!
Application URL: $APP_URL
Dashboard: https://console.cloud.google.com/monitoring/dashboards?project=$GCP_PROJECT_ID
" 