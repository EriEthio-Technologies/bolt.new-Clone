import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Container } from 'typedi';
import { ScanHistory } from '../ScanHistory';
import { UIMonitor } from '../../../lib/monitoring/UIMonitor';

jest.mock('../../../lib/monitoring/UIMonitor');

describe('ScanHistory', () => {
  let mockUIMonitor: jest.Mocked<UIMonitor>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    Container.set(UIMonitor, mockUIMonitor);
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
  });

  it('displays loading state initially', () => {
    render(<ScanHistory />);
    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('renders scan history after loading', async () => {
    render(<ScanHistory />);

    await waitFor(() => {
      expect(screen.getByTestId('scan-history')).toBeInTheDocument();
    });

    expect(screen.getByTestId('scan-scan-001')).toBeInTheDocument();
    expect(screen.getByTestId('scan-scan-002')).toBeInTheDocument();
    expect(screen.getByText('5 vulnerabilities')).toBeInTheDocument();
  });

  it('tracks loading state with UIMonitor', async () => {
    render(<ScanHistory />);

    await waitFor(() => {
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'ScanHistory',
        duration: expect.any(Number),
        variant: 'loadHistory',
        hasOverlay: false
      });
    });
  });

  it('displays risk levels correctly', async () => {
    render(<ScanHistory />);

    await waitFor(() => {
      expect(screen.getByTestId('scan-scan-001')).toHaveClass('risk-high');
      expect(screen.getByTestId('scan-scan-002')).toHaveClass('risk-medium');
    });
  });
}); 