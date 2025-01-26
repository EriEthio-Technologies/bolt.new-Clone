import React from 'react';
import { SecurityAuditReport } from '../../lib/security/SecurityAuditService';

interface Props {
  overallRisk: SecurityAuditReport['overallRisk'];
  vulnerabilityCount: number;
  lastScanTime: Date;
}

export const SecurityMetrics: React.FC<Props> = ({
  overallRisk,
  vulnerabilityCount,
  lastScanTime
}) => {
  return (
    <div className="security-metrics" data-testid="security-metrics">
      <div className={`risk-indicator risk-${overallRisk}`}>
        <h3>Overall Risk</h3>
        <span className="risk-level">{overallRisk}</span>
      </div>

      <div className="metric-card">
        <h3>Vulnerabilities</h3>
        <span className="metric-value">{vulnerabilityCount}</span>
      </div>

      <div className="metric-card">
        <h3>Last Scan</h3>
        <span className="metric-value">
          {new Date(lastScanTime).toLocaleString()}
        </span>
      </div>
    </div>
  );
}; 