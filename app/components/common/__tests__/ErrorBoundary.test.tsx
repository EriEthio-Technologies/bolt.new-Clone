import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';

// Mock UIMonitor
jest.mock('~/lib/services/monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;
  beforeAll(() => {
    // Suppress console.error for cleaner test output
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  const ThrowError: React.FC<{ message?: string }> = ({ message = 'Test error' }) => {
    throw new Error(message);
  };

  it('renders children when no error occurs', () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary>
    );

    expect(container).toHaveTextContent('Content');
  });

  it('renders fallback UI when error occurs', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(container).toHaveTextContent('Something went wrong');
    expect(container).toHaveTextContent('Test error');
  });

  it('calls onError prop when error occurs', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('tracks error in monitoring system', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const mockUIMonitor = (UIMonitor as jest.Mock).mock.results[0].value;
    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'ErrorBoundary',
      duration: 0,
      variant: 'error',
      hasOverlay: false
    });
  });

  it('resets error state when retry button is clicked and resetOnRetry is true', () => {
    const TestComponent: React.FC<{ shouldError?: boolean }> = ({ shouldError }) => {
      if (shouldError) {
        throw new Error('Test error');
      }
      return <div>Content</div>;
    };

    const { rerender } = render(
      <ErrorBoundary resetOnRetry>
        <TestComponent shouldError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Click retry button and update component to not throw
    fireEvent.click(screen.getByText('Try again'));
    rerender(
      <ErrorBoundary resetOnRetry>
        <TestComponent shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('supports custom fallback component', () => {
    const CustomFallback: React.FC<any> = ({ error }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError message="Custom error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Custom error message')).toBeInTheDocument();
  });

  describe('error recovery', () => {
    it('maintains error state when resetOnRetry is false', () => {
      render(
        <ErrorBoundary resetOnRetry={false}>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Try again'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles nested error boundaries correctly', () => {
      render(
        <ErrorBoundary>
          <div>Outer content</div>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByText('Outer content')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
}); 