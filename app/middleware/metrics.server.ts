import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/MetricsService';

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    
    // Add response finish handler
    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const duration = (diff[0] * 1e9 + diff[1]) / 1e9; // Convert to seconds
      
      MetricsService.recordRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration
      );
    });
    
    next();
  };
}