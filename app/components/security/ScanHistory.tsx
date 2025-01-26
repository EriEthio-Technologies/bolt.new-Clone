import React, { useEffect, useState } from 'react';
import { Container } from 'typedi';
import { SecurityAuditReport } from '../../lib/security/SecurityAuditService';
import { UIMonitor } from '../../lib/monitoring/UIMonitor';

interface ScanRecord {
  id: string;
  timestamp: Date;
  overallRisk: SecurityAuditReport['overallRisk'];
  vulnerabilityCount: number;
}

export const ScanHistory: React.FC = () => {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const uiMonitor = Container.get(UIMonitor);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const startTime = Date.now();
    setLoading(true);

    try {
      // In a real app, this would fetch from an API
      const mockHistory: ScanRecord[] = [
        {
          id: 'scan-001',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          overallRisk: 'high',
          vulnerabilityCount: 5
        },
        {
          id: 'scan-002',
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
          overallRisk: 'medium',
          vulnerabilityCount: 3
        }
      ];

      setHistory(mockHistory);

      await uiMonitor.trackLoadingState({
        component: 'ScanHistory',
        duration: Date.now() - startTime,
        variant: 'loadHistory',
        hasOverlay: false
      });
    } catch (error) {
      await uiMonitor.trackLoadingState({
        component: 'ScanHistory',
        duration: Date.now() - startTime,
        variant: 'loadHistoryError',
        hasOverlay: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading history...</div>;
  }

  return (
    <div className="scan-history" data-testid="scan-history">
      <h2>Scan History</h2>
      <div className="history-list">
        {history.map(scan => (
          <div 
            key={scan.id}
            className={`history-item risk-${scan.overallRisk}`}
            data-testid={`scan-${scan.id}`}
          >
            <div className="scan-info">
              <span className="timestamp">
                {new Date(scan.timestamp).toLocaleString()}
              </span>
              <span className={`risk-badge ${scan.overallRisk}`}>
                {scan.overallRisk}
              </span>
            </div>
            <div className="vulnerability-count">
              {scan.vulnerabilityCount} vulnerabilities
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 