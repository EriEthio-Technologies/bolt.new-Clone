import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../LoadingState';
import { useTheme } from '~/hooks/useTheme';

// Mock the useTheme hook
jest.mock('~/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: {
          100: '#E6E6E6',
          500: '#3B82F6'
        },
        gray: {
          200: '#E5E7EB',
          700: '#374151'
        }
      },
      spacing: {
        3: '0.75rem',
        4: '1rem'
      },
      typography: {
        size: {
          sm: '0.875rem'
        }
      },
      zIndex: {
        modal: 1000
      }
    }
  })
}));

describe('LoadingState', () => {
  it('renders spinner variant by default', () => {
    render(<LoadingState />);
    
    const spinner = screen.getByTestId('loading-state').firstChild;
    expect(spinner).toHaveStyle({
      width: '48px',
      height: '48px',
      borderRadius: '50%'
    });
  });

  it('displays custom message', () => {
    const message = 'Processing request...';
    render(<LoadingState message={message} />);
    
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<LoadingState size="small" />);
    let spinner = screen.getByTestId('loading-state').firstChild;
    expect(spinner).toHaveStyle({ width: '24px', height: '24px' });

    rerender(<LoadingState size="large" />);
    spinner = screen.getByTestId('loading-state').firstChild;
    expect(spinner).toHaveStyle({ width: '72px', height: '72px' });
  });

  it('renders progress variant with correct progress', () => {
    const progress = 75;
    render(<LoadingState variant="progress" progress={progress} />);
    
    const progressBar = screen.getByTestId('loading-state')
      .querySelector('div > div') as HTMLElement;
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('applies overlay styles when overlay prop is true', () => {
    render(<LoadingState overlay />);
    
    const container = screen.getByTestId('loading-state');
    expect(container).toHaveStyle({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000
    });
  });

  it('has correct ARIA attributes', () => {
    const message = 'Loading content';
    render(<LoadingState message={message} />);
    
    const container = screen.getByTestId('loading-state');
    expect(container).toHaveAttribute('role', 'alert');
    expect(container).toHaveAttribute('aria-busy', 'true');
    expect(container).toHaveAttribute('aria-label', message);
  });

  describe('animation behavior', () => {
    it('spinner has infinite rotation animation', () => {
      render(<LoadingState />);
      
      const spinner = screen.getByTestId('loading-state').firstChild;
      expect(spinner).toHaveAttribute('animate', 'animate');
      // Check if animation variants are applied
      expect(spinner).toHaveAttribute('variants');
    });

    it('progress bar animates width changes', () => {
      const { rerender } = render(
        <LoadingState variant="progress" progress={25} />
      );
      
      let progressBar = screen.getByTestId('loading-state')
        .querySelector('div > div') as HTMLElement;
      expect(progressBar).toHaveStyle({ width: '25%' });

      rerender(<LoadingState variant="progress" progress={50} />);
      progressBar = screen.getByTestId('loading-state')
        .querySelector('div > div') as HTMLElement;
      expect(progressBar).toHaveStyle({ width: '50%' });
    });
  });

  describe('error handling', () => {
    it('handles missing progress value in progress variant', () => {
      render(<LoadingState variant="progress" />);
      
      const progressBar = screen.getByTestId('loading-state')
        .querySelector('div > div') as HTMLElement;
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('handles invalid size prop gracefully', () => {
      // @ts-expect-error - Testing invalid prop
      render(<LoadingState size="invalid" />);
      
      const spinner = screen.getByTestId('loading-state').firstChild;
      // Should fall back to medium size
      expect(spinner).toHaveStyle({ width: '48px', height: '48px' });
    });
  });
}); 