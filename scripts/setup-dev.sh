#!/bin/bash

# Exit on error
set -e

echo "Setting up development environment..."

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }

# Install dependencies
echo "Installing dependencies..."
npm install

# Setup git hooks
echo "Setting up git hooks..."
npx husky install

# Setup environment variables
echo "Setting up environment variables..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

# Setup development certificates for HTTPS
echo "Setting up development certificates..."
mkdir -p .cert
if [ ! -f .cert/localhost.key ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout .cert/localhost.key \
    -out .cert/localhost.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Initialize development database
echo "Setting up development database..."
npm run db:setup

# Build development assets
echo "Building development assets..."
npm run build:dev

echo "Development environment setup complete!"
echo "Run 'npm run dev' to start the development server." 