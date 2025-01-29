# Deployment Guide

## Prerequisites
- Google Cloud Platform account with required permissions
- `gcloud` CLI installed and configured
- Docker installed
- kubectl configured for GKE

## Environment Setup
1. Set required environment variables:
```bash
export PROJECT_ID=your-project-id
export REGION=your-region
export CLUSTER_NAME=your-cluster-name
```

2. Configure authentication:
```bash
gcloud auth configure-docker
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
```

## Deployment Steps

1. Build and push the Docker image:
```bash
docker build -t gcr.io/$PROJECT_ID/app:latest .
docker push gcr.io/$PROJECT_ID/app:latest
```

2. Update Kubernetes configs:
```bash
# Update image in deployment config
sed -i "s/PROJECT_ID/$PROJECT_ID/g" k8s/deployments/*.yaml

# Apply configurations
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/config/
kubectl apply -f k8s/secrets/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
```

3. Configure monitoring:
```bash
kubectl apply -f k8s/monitoring/
```

4. Verify deployment:
```bash
kubectl get pods -n production
kubectl get services -n production
```

## Security Considerations
- All sensitive data is encrypted using AES-256
- API rate limiting is enabled
- Security headers are configured
- VPC connector is set up for network security

## Monitoring
- Access Grafana dashboard: http://monitoring.your-domain.com
- Alert configurations in AlertManager
- Logging available in Cloud Logging

## Troubleshooting
1. Check pod logs:
```bash
kubectl logs <pod-name> -n production
```

2. Check service status:
```bash
kubectl describe service <service-name> -n production
```

3. View monitoring alerts:
```bash
kubectl get prometheusrule -n monitoring
```

## Rollback Procedure
To rollback to a previous version:
```bash
kubectl rollout undo deployment/app-deployment -n production
```

## Support
For issues, contact: team@example.com