#!/bin/bash

# Exit on error
set -e

# Clean up deployment directory
rm -rf deploy/gcp/*
mkdir -p deploy/gcp/build deploy/gcp/public deploy/gcp/app

# Install dependencies and build locally
REMIX_CONFIG_PATH=remix.config.cjs npm ci
REMIX_CONFIG_PATH=remix.config.cjs npm run build

# Copy files to deployment directory maintaining structure
cp -r build/* deploy/gcp/build/
cp -r public/* deploy/gcp/public/
cp -r app/* deploy/gcp/app/
cp package.json package-lock.json remix.config.cjs app.yaml cloudbuild.yaml deploy/gcp/

# Install production dependencies in deployment directory
cd deploy/gcp
npm ci --omit=dev

# Deploy to App Engine
gcloud builds submit --config=cloudbuild.yaml .

echo "Deployment complete!" 