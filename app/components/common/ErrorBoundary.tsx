import React from 'react';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';
import type { ErrorBoundaryProps, ErrorBoundaryState } from '~/types/error';

const DefaultFallback: React.FC<any> = ({ error, resetErrorBoundary }) => (
  <div role="alert" className="error-boundary">
    <h2>Something went wrong</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private uiMonitor: UIMonitor;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
    this.uiMonitor = new UIMonitor();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Track error in monitoring
    this.trackError(error, errorInfo);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async trackError(error: Error, errorInfo: React.ErrorInfo): Promise<void> {
    try {
      await this.uiMonitor.trackLoadingState({
        component: 'ErrorBoundary',
        duration: 0,
        variant: 'error',
        hasOverlay: false
      });
    } catch (monitoringError) {
      console.error('Failed to track error:', monitoringError);
    }
  }

  private resetErrorBoundary = (): void => {
    if (this.props.resetOnRetry) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  };

  render(): React.ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: Fallback = DefaultFallback } = this.props;

    if (hasError && error && errorInfo) {
      return (
        <Fallback
          error={error}
          errorInfo={errorInfo}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return children;
  }
} 