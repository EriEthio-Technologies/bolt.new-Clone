import { type Request, type Response, type NextFunction } from 'express';
import { AuthError } from '~/errors/AuthError';
import { RateLimitError } from '~/errors/RateLimitError';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(error);

  if (error instanceof AuthError) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }

  if (error instanceof RateLimitError) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: error.message
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
} 