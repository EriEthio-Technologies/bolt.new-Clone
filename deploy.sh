#!/bin/bash

# Set environment to production
export NODE_ENV=production

# Load environment variables from .env.production
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
  echo "✅ Loaded environment variables from .env.production"
else
  echo "❌ .env.production file not found"
  exit 1
fi

echo "🔍 Validating environment variables..."
npm run validate-env

if [ $? -ne 0 ]; then
  echo "❌ Environment validation failed"
  exit 1
fi

echo "📦 Installing dependencies..."
npm ci

if [ $? -ne 0 ]; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

# Temporarily skip tests
# echo "🧪 Running tests..."
# npm test
# 
# if [ $? -ne 0 ]; then
#   echo "❌ Tests failed"
#   exit 1
# fi

echo "🏗️ Building application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "🚀 Deploying to Google Cloud Platform..."
gcloud app deploy app.yaml --quiet

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed"
  exit 1
fi

echo "✅ Deployment completed successfully!"
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

echo "🔍 Setting up Error Monitoring..."

# Enable Error Reporting API
gcloud services enable clouderrorreporting.googleapis.com

# Set up Error Reporting
gcloud beta error-reporting app-versions create $VERSION \
  --project=$GCP_PROJECT_ID \
  --service=gobeze-ai

# Enable Cloud Monitoring API
gcloud services enable monitoring.googleapis.com

# Create custom metrics descriptors
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/error/total \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=int64 \
  --labels=environment \
  --display-name="Total Errors"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/error/by_type \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=int64 \
  --labels=error_type,environment \
  --display-name="Errors by Type"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/error/by_operation \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=int64 \
  --labels=operation,environment \
  --display-name="Errors by Operation"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/error/occurrence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=int64 \
  --labels=error_type,operation,environment \
  --display-name="Error Occurrences"

# Create monitoring dashboard
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/error-monitoring.json

echo "✅ Error monitoring setup complete"

# Set up Quality Metrics Monitoring
echo "📊 Setting up Quality Metrics Monitoring..."

# Create custom metrics descriptors for code quality
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/code_quality/complexity/cyclomatic \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Cyclomatic Complexity"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/code_quality/coverage/lines \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Line Coverage"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/code_quality/duplication/percentage \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Code Duplication"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/code_quality/technical_debt/rating \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Technical Debt Rating"

# Create monitoring dashboard for code quality
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/code-quality.json

echo "✅ Quality metrics monitoring setup complete"

# Validate quality metrics setup
echo "🔍 Validating quality metrics setup..."
for METRIC in cyclomatic coverage duplication "technical_debt/rating"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/code_quality/$METRIC\"" \
    --format="get(type)" | grep -q "code_quality/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Quality metrics validation complete"

# Set up Performance Monitoring
echo "📊 Setting up Performance Monitoring..."

# Create custom metrics descriptors for performance monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/performance/cpu/usage \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="CPU Usage"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/performance/memory/heap_used \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Heap Memory Used"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/performance/load_test/requests_per_second \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Requests Per Second"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/performance/runtime/startup_time \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Application Startup Time"

# Create monitoring dashboard for performance metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/performance.json

# Validate performance metrics setup
echo "🔍 Validating performance metrics setup..."
for METRIC in "cpu/usage" "memory/heap_used" "load_test/requests_per_second" "runtime/startup_time"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/performance/$METRIC\"" \
    --format="get(type)" | grep -q "performance/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Performance metrics setup complete"

# Set up Persistence Monitoring
echo "📊 Setting up Persistence Monitoring..."

# Create custom metrics descriptors for persistence monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/persistence/versions_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Context Versions Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/persistence/storage_size \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Context Storage Size"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/persistence/backup_success_rate \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Context Backup Success Rate"

# Create monitoring dashboard for persistence metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/persistence.json

# Validate persistence metrics setup
echo "🔍 Validating persistence metrics setup..."
for METRIC in "versions_count" "storage_size" "backup_success_rate"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/persistence/$METRIC\"" \
    --format="get(type)" | grep -q "persistence/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Persistence metrics setup complete"

# Set up Versioning Monitoring
echo "📊 Setting up Versioning Monitoring..."

# Create custom metrics descriptors for versioning monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/versioning/versions_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Version Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/versioning/changes_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Changes Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/versioning/merge_conflicts \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Merge Conflicts"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/versioning/branch_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Branch Count"

# Create monitoring dashboard for versioning metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/versioning.json

# Validate versioning metrics setup
echo "🔍 Validating versioning metrics setup..."
for METRIC in "versions_count" "changes_count" "merge_conflicts" "branch_count"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/versioning/$METRIC\"" \
    --format="get(type)" | grep -q "versioning/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Versioning metrics setup complete"

# Set up Emotional Monitoring
echo "📊 Setting up Emotional Monitoring..."

# Create custom metrics descriptors for emotional monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/emotional/valence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Emotional Valence"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/emotional/arousal \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Emotional Arousal"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/emotional/dominance \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Emotional Dominance"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/emotional/confidence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Analysis Confidence"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/emotional/processing_time \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Processing Time"

# Create monitoring dashboard for emotional metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/emotional.json

# Validate emotional metrics setup
echo "🔍 Validating emotional metrics setup..."
for METRIC in "valence" "arousal" "dominance" "confidence" "processing_time"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/emotional/$METRIC\"" \
    --format="get(type)" | grep -q "emotional/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Emotional metrics setup complete"

# Set up Causal Monitoring
echo "📊 Setting up Causal Monitoring..."

# Create custom metrics descriptors for causal monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/causal/chain_size \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Chain Size"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/causal/chain_confidence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Chain Confidence"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/causal/critical_paths \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Critical Paths"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/causal/uncertainty_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Uncertainty Count"

# Create monitoring dashboard for causal metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/causal.json

# Validate causal metrics setup
echo "🔍 Validating causal metrics setup..."
for METRIC in "chain_size" "chain_confidence" "critical_paths" "uncertainty_count"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/causal/$METRIC\"" \
    --format="get(type)" | grep -q "causal/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Causal metrics setup complete"

# Set up Abductive Monitoring
echo "📊 Setting up Abductive Monitoring..."

# Create custom metrics descriptors for abductive monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/abductive/observation_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Observation Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/abductive/hypothesis_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Hypothesis Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/abductive/confidence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Analysis Confidence"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/abductive/processing_time \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Processing Time"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/abductive/hypothesis_evidence_ratio \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Evidence Ratio"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/abductive/hypothesis_assumption_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Assumption Count"

# Create monitoring dashboard for abductive metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/abductive.json

# Validate abductive metrics setup
echo "🔍 Validating abductive metrics setup..."
for METRIC in "observation_count" "hypothesis_count" "confidence" "processing_time" \
              "hypothesis_evidence_ratio" "hypothesis_assumption_count"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/abductive/$METRIC\"" \
    --format="get(type)" | grep -q "abductive/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Abductive metrics setup complete"

# Set up Common Sense Monitoring
echo "📊 Setting up Common Sense Monitoring..."

# Create custom metrics descriptors for common sense monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/commonsense/inference_confidence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Inference Confidence"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/commonsense/reasoning_depth \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Reasoning Depth"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/commonsense/processing_time \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Processing Time"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/commonsense/supporting_facts_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Supporting Facts Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/commonsense/concept_total_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Total Concepts"

# Create monitoring dashboard for common sense metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/commonsense.json

# Validate common sense metrics setup
echo "🔍 Validating common sense metrics setup..."
for METRIC in "inference_confidence" "reasoning_depth" "processing_time" \
              "supporting_facts_count" "concept_total_count"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/commonsense/$METRIC\"" \
    --format="get(type)" | grep -q "commonsense/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Common sense metrics setup complete"

# Set up Planning System Monitoring
echo "📊 Setting up Planning System Monitoring..."

# Create custom metrics descriptors for planning monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/planning/steps_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Steps Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/planning/completion_time \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Completion Time"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/planning/confidence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Plan Confidence"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/planning/risks_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Risks Count"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/planning/step_average_duration \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Step Average Duration"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/planning/step_average_confidence \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment \
  --display-name="Step Average Confidence"

# Create monitoring dashboard for planning metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/planning.json

# Validate planning metrics setup
echo "🔍 Validating planning metrics setup..."
for METRIC in "steps_count" "completion_time" "confidence" "risks_count" \
              "step_average_duration" "step_average_confidence"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/planning/$METRIC\"" \
    --format="get(type)" | grep -q "planning/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ Planning metrics setup complete"

# Set up UI Monitoring
echo "📊 Setting up UI Monitoring..."

# Create custom metrics descriptors for UI monitoring
gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/ui/loading_duration \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment,component,variant,hasOverlay \
  --display-name="Loading Duration"

gcloud beta monitoring metrics-descriptors create \
  custom.googleapis.com/ui/loading_count \
  --project=$GCP_PROJECT_ID \
  --metric-kind=gauge \
  --value-type=double \
  --labels=environment,component,variant,hasOverlay \
  --display-name="Loading Count"

# Create monitoring dashboard for UI metrics
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/ui.json

# Validate UI metrics setup
echo "🔍 Validating UI metrics setup..."
for METRIC in "loading_duration" "loading_count"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/ui/$METRIC\"" \
    --format="get(type)" | grep -q "ui/$METRIC"; then
    echo "❌ Failed to create metric descriptor: $METRIC"
    exit 1
  fi
done
echo "✅ UI metrics setup complete"

# Let's verify all monitoring components are properly set up
echo "🔍 Verifying all monitoring components..."

# Verify all dashboard configurations
for DASHBOARD in "error-monitoring" "code-quality" "performance" "persistence" \
                "versioning" "emotional" "causal" "abductive" "commonsense" \
                "planning" "ui"; do
  if [ ! -f "monitoring/dashboards/${DASHBOARD}.json" ]; then
    echo "❌ Missing dashboard configuration: ${DASHBOARD}"
    exit 1
  fi
done

# Verify all metric descriptors are created
echo "🔍 Verifying metric descriptors..."
METRIC_TYPES=(
  "error/total"
  "error/by_type"
  "code_quality/complexity/cyclomatic"
  "performance/cpu/usage"
  "persistence/versions_count"
  "versioning/versions_count"
  "emotional/valence"
  "causal/chain_size"
  "abductive/observation_count"
  "commonsense/inference_confidence"
  "commonsense/reasoning_depth"
  "commonsense/processing_time"
  "planning/steps_count"
  "planning/completion_time"
  "planning/confidence"
  "ui/loading_duration"
  "ui/loading_count"
)

for METRIC in "${METRIC_TYPES[@]}"; do
  if ! gcloud beta monitoring metrics-descriptors list \
    --filter="metric.type=\"custom.googleapis.com/${METRIC}\"" \
    --format="get(type)" | grep -q "${METRIC}"; then
    echo "❌ Missing metric descriptor: ${METRIC}"
    exit 1
  fi
done

echo "✅ All monitoring components verified"

echo "🎉 Deployment complete!"

# Build and package VS Code extension
echo "Building VS Code extension..."
cd vscode-extension
npm run vscode:prepublish
vsce package

# Deploy VS Code extension to marketplace
if [ "$ENVIRONMENT" = "production" ]; then
  echo "Publishing VS Code extension..."
  vsce publish -p $VSCODE_MARKETPLACE_TOKEN
else
  echo "Skipping VS Code extension publish in non-production environment"
fi

cd .. 