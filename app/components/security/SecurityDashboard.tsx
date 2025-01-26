import React, { useEffect, useState } from 'react';
import { Container } from 'typedi';
import { SecurityAuditService, SecurityAuditReport } from '../../lib/security/SecurityAuditService';
import { UIMonitor } from '../../lib/monitoring/UIMonitor';
import { VulnerabilityList } from './VulnerabilityList';
import { SecurityMetrics } from './SecurityMetrics';
import { ScanHistory } from './ScanHistory';
import { SecurityChart } from './SecurityChart';

export const SecurityDashboard: React.FC = () => {
  const [report, setReport] = useState<SecurityAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const securityService = Container.get(SecurityAuditService);
  const uiMonitor = Container.get(UIMonitor);

  useEffect(() => {
    loadSecurityReport();
  }, []);

  const loadSecurityReport = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      const result = await securityService.runSecurityScan();
      setReport(result);

      await uiMonitor.trackLoadingState({
        component: 'SecurityDashboard',
        duration: Date.now() - startTime,
        variant: 'loadReport',
        hasOverlay: true
      });
    } catch (err) {
      setError('Failed to load security report');
      await uiMonitor.trackLoadingState({
        component: 'SecurityDashboard',
        duration: Date.now() - startTime,
        variant: 'loadReportError',
        hasOverlay: true
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner" data-testid="security-dashboard-loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="error-message" data-testid="security-dashboard-error">
        {error}
        <button onClick={loadSecurityReport}>Retry</button>
      </div>
    );
  }

  return (
    <div className="security-dashboard" data-testid="security-dashboard">
      <header className="dashboard-header">
        <h1>Security Dashboard</h1>
        <button 
          onClick={loadSecurityReport}
          className="refresh-button"
          aria-label="Refresh security scan"
        >
          Refresh
        </button>
      </header>

      {report && (
        <>
          <SecurityMetrics
            overallRisk={report.overallRisk}
            vulnerabilityCount={report.vulnerabilities.length}
            lastScanTime={report.timestamp}
          />

          <div className="dashboard-grid">
            <VulnerabilityList vulnerabilities={report.vulnerabilities} />
            <SecurityChart 
              dependencies={report.dependencies}
              endpoints={report.endpoints}
              codeAnalysis={report.codeAnalysis}
            />
            <ScanHistory />
          </div>
        </>
      )}
    </div>
  );
}; 