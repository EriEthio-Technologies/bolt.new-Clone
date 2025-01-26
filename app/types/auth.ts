export type OAuthProvider = 'google' | 'github';

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  picture?: string;
  provider: OAuthProvider;
  providerId: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface JWTPayload {
  sub: string;
  email?: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface AuthError extends Error {
  code?: string;
  originalError?: Error;
} 