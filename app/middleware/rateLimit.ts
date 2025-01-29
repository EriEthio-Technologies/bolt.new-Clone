import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { MonitoringService } from '../services/monitoring.server';
import { AppError } from '../utils/errorHandler';
import { securityConfig } from '../config/security';

export class RateLimiter {
  private static instance: RateLimiter;
  private readonly monitoring: MonitoringService;
  private readonly limiter: ReturnType<typeof rateLimit>;

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.limiter = this.createLimiter();
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private createLimiter() {
    const config = securityConfig.rateLimiting;
    
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        const error = new AppError(429, 'Too many requests');
        this.monitoring.emitAlert('rateLimitExceeded', {
          ip: req.ip,
          path: req.path,
          timestamp: new Date().toISOString()
        });
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      },
      skip: (req: Request) => {
        // Skip rate limiting for health checks and monitoring endpoints
        return req.path === '/health' || req.path === '/metrics';
      }
    });
  }

  public getMiddleware(): ReturnType<typeof rateLimit> {
    return this.limiter;
  }

  public handleError(error: Error, req: Request, res: Response, next: NextFunction): void {
    this.monitoring.emitAlert('rateLimitError', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    next(new AppError(500, 'Rate limiting error: ' + error.message));
  }
}

// Export singleton instance
export default RateLimiter.getInstance().getMiddleware();