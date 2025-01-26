import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js';
import { DependencyAuditResult } from '../../lib/security/scanners/DependencyScanner';
import { EndpointValidationResult } from '../../lib/security/scanners/EndpointScanner';
import { CodeAnalysisResult } from '../../lib/security/scanners/CodeScanner';

interface Props {
  dependencies: DependencyAuditResult[];
  endpoints: EndpointValidationResult[];
  codeAnalysis: CodeAnalysisResult[];
}

export const SecurityChart: React.FC<Props> = ({
  dependencies,
  endpoints,
  codeAnalysis
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        const data = processChartData(dependencies, endpoints, codeAnalysis);
        chartInstance.current = new Chart(ctx, createChartConfig(data));
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [dependencies, endpoints, codeAnalysis]);

  return (
    <div className="security-chart" data-testid="security-chart">
      <h2>Security Overview</h2>
      <div className="chart-container">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

function processChartData(
  dependencies: DependencyAuditResult[],
  endpoints: EndpointValidationResult[],
  codeAnalysis: CodeAnalysisResult[]
) {
  const severityCounts = {
    critical: { deps: 0, endpoints: 0, code: 0 },
    high: { deps: 0, endpoints: 0, code: 0 },
    medium: { deps: 0, endpoints: 0, code: 0 },
    low: { deps: 0, endpoints: 0, code: 0 }
  };

  // Count dependency vulnerabilities
  dependencies.forEach(dep => {
    dep.vulnerabilities.forEach(vuln => {
      severityCounts[vuln.severity].deps++;
    });
  });

  // Count endpoint vulnerabilities
  endpoints.forEach(endpoint => {
    endpoint.vulnerabilities.forEach(vuln => {
      severityCounts[vuln.severity].endpoints++;
    });
  });

  // Count code vulnerabilities
  codeAnalysis.forEach(analysis => {
    analysis.vulnerabilities.forEach(vuln => {
      severityCounts[vuln.severity].code++;
    });
  });

  return severityCounts;
}

function createChartConfig(data: ReturnType<typeof processChartData>): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [
        {
          label: 'Dependencies',
          data: [data.critical.deps, data.high.deps, data.medium.deps, data.low.deps],
          backgroundColor: 'rgba(255, 99, 132, 0.8)'
        },
        {
          label: 'Endpoints',
          data: [data.critical.endpoints, data.high.endpoints, data.medium.endpoints, data.low.endpoints],
          backgroundColor: 'rgba(54, 162, 235, 0.8)'
        },
        {
          label: 'Code',
          data: [data.critical.code, data.high.code, data.medium.code, data.low.code],
          backgroundColor: 'rgba(75, 192, 192, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  };
} 