import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Container } from 'typedi';
import { SecurityDashboard } from '../SecurityDashboard';
import { SecurityAuditService } from '../../../lib/security/SecurityAuditService';
import { UIMonitor } from '../../../lib/monitoring/UIMonitor';

jest.mock('../../../lib/security/SecurityAuditService');
jest.mock('../../../lib/monitoring/UIMonitor');

describe('SecurityDashboard', () => {
  let mockSecurityService: jest.Mocked<SecurityAuditService>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;

  beforeEach(() => {
    mockSecurityService = {
      runSecurityScan: jest.fn().mockResolvedValue({
        timestamp: new Date(),
        vulnerabilities: [
          {
            id: 'VULN-001',
            type: 'dependency',
            severity: 'high',
            description: 'Test vulnerability',
            affectedComponent: 'test-package',
            remediation: 'Update package'
          }
        ],
        overallRisk: 'high',
        dependencies: [],
        endpoints: [],
        codeAnalysis: []
      })
    } as any;

    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    Container.set(SecurityAuditService, mockSecurityService);
    Container.set(UIMonitor, mockUIMonitor);
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
  });

  it('loads and displays security report', async () => {
    render(<SecurityDashboard />);

    expect(screen.getByTestId('security-dashboard-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('security-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('VULN-001')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalled();
  });

  it('handles refresh action', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('security-dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Refresh security scan'));

    expect(mockSecurityService.runSecurityScan).toHaveBeenCalledTimes(2);
    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledTimes(2);
  });

  it('handles error state', async () => {
    mockSecurityService.runSecurityScan.mockRejectedValueOnce(new Error('Test error'));

    render(<SecurityDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('security-dashboard-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load security report')).toBeInTheDocument();
    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'loadReportError'
      })
    );
  });
}); 