#!/bin/bash

# Ensure environment variables are set
export BASE_URL=${BASE_URL:-"http://localhost:3000"}
export WS_URL=${WS_URL:-"ws://localhost:3000"}

# Run collaboration tests
k6 run \
  --vus 50 \
  --duration 5m \
  scenarios/collaboration.js

# Run file operation tests
k6 run \
  --vus 100 \
  --duration 10m \
  scenarios/file-operations.js

# Generate report
k6 run \
  --out json=test-results.json \
  --out csv=metrics.csv \
  scenarios/*.js 