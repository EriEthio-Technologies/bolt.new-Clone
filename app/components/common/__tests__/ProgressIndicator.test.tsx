import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ProgressIndicator } from '../ProgressIndicator';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';

// Mock UIMonitor
jest.mock('~/lib/services/monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock useTheme hook
jest.mock('~/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: { 500: '#3B82F6' },
        secondary: { 500: '#6B7280' },
        success: { 500: '#10B981' },
        warning: { 500: '#F59E0B' },
        error: { 500: '#EF4444' },
        gray: {
          200: '#E5E7EB',
          700: '#374151'
        }
      },
      spacing: {
        2: '0.5rem',
        4: '1rem'
      },
      typography: {
        size: {
          sm: '0.875rem'
        }
      },
      borderRadius: {
        full: '9999px'
      }
    }
  })
}));

describe('ProgressIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders linear progress bar by default', () => {
    render(<ProgressIndicator value={50} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles different variants correctly', () => {
    const { rerender } = render(<ProgressIndicator value={75} variant="circular" />);
    expect(screen.getByRole('progressbar').querySelector('svg')).toBeInTheDocument();

    rerender(<ProgressIndicator value={75} variant="steps" steps={['Step 1', 'Step 2']} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    const { container, rerender } = render(<ProgressIndicator value={50} size="small" />);
    expect(container.querySelector('.progress-linear')).toHaveStyle({
      width: '120px',
      height: '4px'
    });

    rerender(<ProgressIndicator value={50} size="large" />);
    expect(container.querySelector('.progress-linear')).toHaveStyle({
      width: '300px',
      height: '12px'
    });
  });

  it('formats label correctly', () => {
    const customFormatter = (value: number, max: number) => `${value} of ${max}`;
    render(
      <ProgressIndicator
        value={25}
        max={50}
        labelFormatter={customFormatter}
      />
    );
    
    expect(screen.getByText('25 of 50')).toBeInTheDocument();
  });

  it('handles indeterminate state', () => {
    render(<ProgressIndicator value={50} indeterminate />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).not.toHaveAttribute('aria-valuenow');
    expect(progressBar).toHaveAttribute('aria-valuetext', 'Loading...');
  });

  it('tracks performance metrics', () => {
    const { unmount } = render(<ProgressIndicator value={50} />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
      unmount();
    });

    const mockUIMonitor = (UIMonitor as jest.Mock).mock.results[0].value;
    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'ProgressIndicator',
      duration: expect.any(Number),
      variant: 'linear',
      hasOverlay: false
    });
  });

  describe('steps variant', () => {
    const steps = ['Step 1', 'Step 2', 'Step 3'];

    it('renders all steps with correct completion state', () => {
      render(
        <ProgressIndicator
          value={1}
          variant="steps"
          steps={steps}
        />
      );

      steps.forEach(step => {
        expect(screen.getByText(step)).toBeInTheDocument();
      });

      const stepElements = screen.getAllByRole('progressbar')[0]
        .querySelectorAll('.progress-steps > div');
      expect(stepElements).toHaveLength(3);
    });

    it('highlights current step', () => {
      const { container } = render(
        <ProgressIndicator
          value={1}
          variant="steps"
          steps={steps}
          color="primary"
        />
      );

      const stepElements = container.querySelectorAll('.progress-steps > div');
      const currentStep = stepElements[1];
      expect(currentStep).toHaveTextContent('Step 2');
      expect(currentStep.querySelector('motion.div')).toHaveStyle({
        scale: 1.2
      });
    });
  });

  describe('accessibility', () => {
    it('provides correct ARIA attributes', () => {
      render(<ProgressIndicator value={75} max={200} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '200');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuetext', '38%');
    });

    it('handles zero and maximum values correctly', () => {
      const { rerender } = render(<ProgressIndicator value={0} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

      rerender(<ProgressIndicator value={100} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('error handling', () => {
    it('clamps values to valid range', () => {
      const { rerender } = render(<ProgressIndicator value={-10} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

      rerender(<ProgressIndicator value={150} max={100} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('handles missing steps gracefully', () => {
      render(<ProgressIndicator value={1} variant="steps" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar.querySelector('.progress-steps')).toBeEmptyDOMElement();
    });
  });
}); 