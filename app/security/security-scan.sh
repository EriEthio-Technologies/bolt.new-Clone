#!/bin/bash

# Exit on error
set -e

echo "Starting security scan..."

# Run npm audit for dependency vulnerabilities
echo "Running dependency vulnerability scan..."
npm audit

# Run OWASP Dependency-Check
echo "Running OWASP Dependency-Check..."
dependency-check \
  --project "Code Editor" \
  --scan . \
  --exclude "**/node_modules/**" \
  --exclude "**/dist/**" \
  --format HTML \
  --format JSON \
  --out reports/dependency-check

# Run ESLint security plugin
echo "Running static code analysis..."
npx eslint . \
  --config .eslintrc.json \
  --plugin security \
  --rule 'security/detect-possible-timing-attacks: error' \
  --rule 'security/detect-non-literal-regexp: error' \
  --rule 'security/detect-unsafe-regex: error' \
  --rule 'security/detect-buffer-noassert: error' \
  --format json \
  -o reports/eslint-security.json

# Run OWASP ZAP baseline scan
echo "Running OWASP ZAP API security scan..."
docker run -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable zap-baseline.py \
  -c /zap/wrk/app/security/zap-baseline.conf \
  -t http://localhost:3000 \
  -g gen.conf \
  -r report.html \
  --auto

# Combine reports
echo "Generating combined security report..."
node ./app/security/combine-reports.js

echo "Security scan completed. Reports available in ./reports directory."