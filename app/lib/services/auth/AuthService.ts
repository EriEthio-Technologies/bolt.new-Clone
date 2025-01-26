import { Service } from 'typedi';
import { OAuth2Client } from 'google-auth-library';
import { JWTService } from './JWTService';
import { UserService } from './UserService';
import type { AuthUser, OAuthProvider, TokenResponse } from '~/types/auth';
import { AuthError } from '~/errors/AuthError';

@Service()
export class AuthService {
  private googleClient: OAuth2Client;
  private jwtService: JWTService;
  private userService: UserService;

  constructor() {
    this.googleClient = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    this.jwtService = new JWTService();
    this.userService = new UserService();
  }

  async authenticateWithProvider(
    provider: OAuthProvider,
    code: string
  ): Promise<TokenResponse> {
    try {
      let user: AuthUser;

      switch (provider) {
        case 'google': {
          user = await this.handleGoogleAuth(code);
          break;
        }
        // Add other providers here
        default:
          throw new AuthError('Unsupported provider');
      }

      const existingUser = await this.userService.findByEmail(user.email);
      const userData = existingUser || await this.userService.create(user);

      const accessToken = await this.jwtService.generateAccessToken(userData);
      const refreshToken = await this.jwtService.generateRefreshToken(userData);

      return {
        accessToken,
        refreshToken,
        user: userData
      };
    } catch (error) {
      throw new AuthError('Authentication failed', error);
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = await this.jwtService.verifyRefreshToken(refreshToken);
      const user = await this.userService.findById(payload.sub);

      if (!user) {
        throw new AuthError('User not found');
      }

      const newAccessToken = await this.jwtService.generateAccessToken(user);
      const newRefreshToken = await this.jwtService.generateRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user
      };
    } catch (error) {
      throw new AuthError('Token refresh failed', error);
    }
  }

  private async handleGoogleAuth(code: string): Promise<AuthUser> {
    const { tokens } = await this.googleClient.getToken(code);
    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AuthError('Invalid Google token');
    }

    return {
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
      provider: 'google',
      providerId: payload.sub
    };
  }
} 