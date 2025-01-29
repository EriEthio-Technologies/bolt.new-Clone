export enum AlertLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Alert {
  level: AlertLevel;
  message: string;
  source: string;
  timestamp: Date;
}

export interface MonitoringConfig {
  serviceName: string;
  alertThresholds: {
    [key: string]: number;
  };
  checkIntervalMs: number;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
}

export interface SecurityMetrics {
  failedLogins: number;
  suspiciousActivities: number;
  unauthorizedAccess: number;
  bruteForceAttempts: number;
}

export interface MetricValue {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}