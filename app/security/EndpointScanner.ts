import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

interface ScanRule {
  pattern: RegExp;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export class EndpointScanner {
  private static rules: ScanRule[] = [
    {
      pattern: /(?:[^a-zA-Z0-9]|^)(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s/i,
      severity: 'HIGH',
      description: 'Potential SQL injection attempt detected'
    },
    {
      pattern: /<script[^>]*>[\s\S]*?<\/script>/i,
      severity: 'HIGH',
      description: 'Potential XSS attempt detected'
    },
    {
      pattern: /\.\.\//g,
      severity: 'MEDIUM',
      description: 'Path traversal attempt detected'
    },
    {
      pattern: /(\{|\%7B)(\s*):(\s*)([^}]*)(}|\%7D)/i,
      severity: 'MEDIUM',
      description: 'Potential template injection detected'
    }
  ];

  private static shouldScanPath(path: string): boolean {
    const excludedPaths = ['/health', '/metrics', '/favicon.ico'];
    return !excludedPaths.includes(path);
  }

  private static scanContent(content: string): { detected: boolean; threats: string[] } {
    const threats: string[] = [];
    
    for (const rule of this.rules) {
      if (rule.pattern.test(content)) {
        threats.push(`${rule.severity}: ${rule.description}`);
      }
    }
    
    return {
      detected: threats.length > 0,
      threats
    };
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.shouldScanPath(req.path)) {
        return next();
      }

      const scanParams = [
        req.query ? JSON.stringify(req.query) : '',
        req.body ? JSON.stringify(req.body) : '',
        req.params ? JSON.stringify(req.params) : '',
        req.headers ? JSON.stringify(req.headers) : ''
      ].join('');

      const scanResult = this.scanContent(scanParams);

      if (scanResult.detected) {
        const requestHash = createHash('sha256')
          .update(scanParams)
          .digest('hex')
          .substr(0, 8);

        const { MetricsService } = require('~/services/MetricsService');
        MetricsService.recordSecurityBlock(scanResult.threats[0].split(':')[0], 'HIGH');
        console.error(`Security threat detected [${requestHash}]:`, {
          path: req.path,
          threats: scanResult.threats,
          ip: req.ip
        });

        return res.status(403).json({
          error: 'Request blocked due to security concerns',
          requestId: requestHash
        });
      }

      next();
    };
  }
}