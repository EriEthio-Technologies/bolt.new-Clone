import { Request, Response, NextFunction } from 'express';
import { AIServiceError } from '~/errors/AIServiceError';
import { createScopedLogger } from './logger';

const logger = createScopedLogger('ErrorHandler');

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  // Send generic error response in production
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class ErrorHandler {
  static handle(error: unknown): void {
    if (error instanceof AIServiceError) {
      logger.error('AI Service Error:', error.message);
      // Handle AI-specific errors
      return;
    }

    if (error instanceof Error) {
      logger.error('Application Error:', error.message);
      // Handle general errors
      return;
    }

    logger.error('Unknown Error:', error);
  }

  static async handleAsync<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      this.handle(error);
      throw error;
    }
  }
}