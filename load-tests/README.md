# Load Testing Documentation

This directory contains load testing scenarios and configuration for the application. The tests are implemented using k6, a modern load testing tool.

## Setup

1. Install k6: https://k6.io/docs/getting-started/installation
2. Configure environment variables in `.env`:
   ```
   BASE_URL=http://localhost:3000
   WS_URL=ws://localhost:3000
   API_KEY=your_api_key
   ```

## Test Scenarios

### 1. API Operations
Tests basic API endpoints including authentication and data retrieval.
- Login
- Projects list
- Documents list
- User profile

### 2. File Operations
Tests document CRUD operations:
- Create document
- Update document
- Read document
- Delete document

### 3. Collaborative Editing
Tests real-time collaboration features:
- WebSocket connection
- Document joining
- Real-time updates

## Running Tests

1. Start the application in test environment
2. Run all scenarios:
   ```bash
   ./run-tests.sh
   ```

Or run individual scenarios:
```bash
k6 run scenarios/api-operations.js
k6 run scenarios/file-operations.js
k6 run scenarios/collaboration.js
```

## Configuration

Load test phases:
1. Warm-up: 60s, 5-50 VUs
2. Load test: 120s, 50 VUs
3. Stress test: 60s, 100 VUs

## Metrics

Key metrics collected:
- Response times (p95, p99)
- Error rates
- Request rates
- WebSocket connection stability