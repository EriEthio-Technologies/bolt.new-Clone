import { type Request, type Response, type NextFunction } from 'express';
import { Container } from 'typedi';
import { APIKeyService } from '~/lib/services/api/APIKeyService';
import { APIKeyError } from '~/errors/APIKeyError';

export async function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return next(new APIKeyError('API key is required'));
  }

  const apiKeyService = Container.get(APIKeyService);
  const isValid = await apiKeyService.validateAPIKey(apiKey as string);

  if (!isValid) {
    return next(new APIKeyError('Invalid API key'));
  }

  next();
} 