export interface ErrorContext {
  operation?: string;
  critical?: boolean;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsByOperation: Map<string, number>;
} 