import { Service } from 'typedi';
import jwt from 'jsonwebtoken';
import type { AuthUser, JWTPayload } from '~/types/auth';
import { AuthError } from '~/errors/AuthError';

@Service()
export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  async generateAccessToken(user: AuthUser): Promise<string> {
    try {
      return jwt.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'access'
        },
        this.accessTokenSecret,
        { expiresIn: this.accessTokenExpiry }
      );
    } catch (error) {
      throw new AuthError('Access token generation failed', error);
    }
  }

  async generateRefreshToken(user: AuthUser): Promise<string> {
    try {
      return jwt.sign(
        {
          sub: user.id,
          type: 'refresh'
        },
        this.refreshTokenSecret,
        { expiresIn: this.refreshTokenExpiry }
      );
    } catch (error) {
      throw new AuthError('Refresh token generation failed', error);
    }
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      if (payload.type !== 'access') {
        throw new AuthError('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new AuthError('Token verification failed', error);
    }
  }

  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;
      if (payload.type !== 'refresh') {
        throw new AuthError('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new AuthError('Token verification failed', error);
    }
  }
} 