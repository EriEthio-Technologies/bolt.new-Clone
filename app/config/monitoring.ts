export const monitoringConfig = {
  metrics: {
    enabled: true,
    cloudWatch: {
      enabled: process.env.NODE_ENV === 'production',
      namespace: 'Application/Metrics',
      region: process.env.AWS_REGION || 'us-east-1'
    },
    prometheus: {
      enabled: false, // Future implementation
      port: 9090
    }
  },
  alerts: {
    enabled: true,
    channels: {
      console: true,
      email: process.env.ALERT_EMAIL_ENABLED === 'true',
      slack: process.env.ALERT_SLACK_ENABLED === 'true'
    },
    thresholds: {
      errorRate: 0.05,
      responseTime: 1000,
      memoryUsage: 0.9
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json'
  }
};

export default monitoringConfig;