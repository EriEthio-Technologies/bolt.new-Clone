import { type Request, type Response, type NextFunction } from 'express';
import { Container } from 'typedi';
import { APIMetricsService } from '~/lib/services/monitoring/APIMetricsService';

export async function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  
  // Store the original end function
  const originalEnd = res.end;
  
  // Override the end function
  res.end = function(...args) {
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    const metricsService = Container.get(APIMetricsService);
    metricsService.recordAPICall({
      method: req.method,
      endpoint: req.path,
      status: res.statusCode,
      latency,
      userId: req.user?.id,
      apiKeyId: req.headers['x-api-key'] as string
    }).catch(console.error);
    
    originalEnd.apply(res, args);
  };
  
  next();
} 