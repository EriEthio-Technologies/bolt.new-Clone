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

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Custom fallback component to render when error occurs */
  fallback?: React.ComponentType<FallbackProps>;
  /** Callback fired when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Whether to reset error state when retrying */
  resetOnRetry?: boolean;
}

export interface FallbackProps {
  /** The error that was caught */
  error: Error;
  /** Error stack trace information */
  errorInfo: React.ErrorInfo;
  /** Function to reset error boundary state */
  resetErrorBoundary: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
} 