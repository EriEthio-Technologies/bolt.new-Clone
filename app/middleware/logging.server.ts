import { Request, Response, NextFunction } from 'express';

export function loggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    
    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const duration = (diff[0] * 1e9 + diff[1]) / 1e9; // Convert to seconds
      
      // Log in a format that Fluentd can parse
      console.log(`method=${req.method} path=${req.path} status=${res.statusCode} duration=${duration}`);
    });
    
    next();
  };
}