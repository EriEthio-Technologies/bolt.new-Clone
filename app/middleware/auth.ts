import { type Request, type Response, type NextFunction } from 'express';
import { Container } from 'typedi';
import { JWTService } from '~/lib/services/auth/JWTService';
import { AuthError } from '~/errors/AuthError';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const jwtService = Container.get(JWTService);
    const payload = await jwtService.verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    next(new AuthError('Authentication failed', error));
  }
} 