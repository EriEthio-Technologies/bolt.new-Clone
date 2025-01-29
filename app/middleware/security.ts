import { rateLimitMiddleware } from './rateLimit';
import { SecurityMonitoringService } from '../lib/monitoring/SecurityMonitoringService';
import Container from 'typedi';

const securityMonitoring = Container.get(SecurityMonitoringService);

export const securityMiddleware = [
  // Rate limiting
  rateLimitMiddleware,
  
  // Security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.example.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }),
  
  // CORS configuration
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }),

  // Security monitoring middleware
  async (req, res, next) => {
    try {
      await securityMonitoring.trackSecurityEvent({
        type: 'request',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      next();
    } catch (error) {
      next(error);
    }
  }
]; 