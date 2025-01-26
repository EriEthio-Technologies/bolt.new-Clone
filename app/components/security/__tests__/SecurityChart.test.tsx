import React from 'react';
import { render, screen } from '@testing-library/react';
import { SecurityChart } from '../SecurityChart';
import { Chart } from 'chart.js';

jest.mock('chart.js');

describe('SecurityChart', () => {
  const mockProps = {
    dependencies: [
      {
        name: 'test-pkg',
        version: '1.0.0',
        vulnerabilities: [
          {
            id: 'DEP-001',
            severity: 'high',
            description: 'Test vulnerability',
            fixedIn: '2.0.0'
          }
        ]
      }
    ],
    endpoints: [
      {
        path: '/test',
        method: 'GET',
        vulnerabilities: [],
        securityHeaders: [],
        authenticationRequired: true,
        rateLimited: true
      }
    ],
    codeAnalysis: [
      {
        file: 'test.ts',
        vulnerabilities: [],
        codeQuality: {
          complexity: 5,
          maintainability: 80,
          issues: []
        }
      }
    ]
  };

  beforeEach(() => {
    (Chart as jest.Mock).mockClear();
  });

  it('renders chart with correct data', () => {
    render(<SecurityChart {...mockProps} />);

    expect(screen.getByTestId('security-chart')).toBeInTheDocument();
    expect(Chart).toHaveBeenCalledWith(
      expect.any(CanvasRenderingContext2D),
      expect.objectContaining({
        type: 'bar',
        data: expect.objectContaining({
          datasets: expect.arrayContaining([
            expect.objectContaining({
              label: 'Dependencies'
            })
          ])
        })
      })
    );
  });

  it('destroys chart instance on unmount', () => {
    const mockDestroy = jest.fn();
    (Chart as jest.Mock).mockImplementation(() => ({
      destroy: mockDestroy
    }));

    const { unmount } = render(<SecurityChart {...mockProps} />);
    unmount();

    expect(mockDestroy).toHaveBeenCalled();
  });
}); 