import { Service } from 'typedi';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { ATProto } from '@atproto/api';
import { validateEnv } from '~/config/env.server';
import type { APIKey, APIKeyScope } from '~/types/api';

@Service()
export class APIKeyService {
  private secretManager: SecretManagerServiceClient;
  private atProto: ATProto;

  constructor() {
    this.secretManager = new SecretManagerServiceClient();
    this.atProto = new ATProto({ 
      service: 'https://api.gobeze.ai',
      credentials: validateEnv().AT_PROTOCOL_KEY
    });
  }

  async createAPIKey(userId: string, scopes: APIKeyScope[]): Promise<APIKey> {
    // Generate a secure API key
    const key = await this.generateSecureKey();
    
    // Store in GCP Secret Manager
    const secretId = `api-key-${userId}-${Date.now()}`;
    await this.secretManager.createSecret({
      parent: `projects/${process.env.GCP_PROJECT_ID}`,
      secretId,
      secret: {
        replication: {
          automatic: {}
        }
      }
    });

    // Store the actual key value
    await this.secretManager.addSecretVersion({
      parent: secretId,
      payload: {
        data: Buffer.from(key)
      }
    });

    // Register with AT Protocol
    await this.atProto.createAppPassword({
      name: `API Key ${secretId}`,
      scopes
    });

    return {
      key,
      scopes,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }

  async validateAPIKey(key: string): Promise<boolean> {
    try {
      // Verify with AT Protocol
      const isValid = await this.atProto.validateAppPassword(key);
      return isValid;
    } catch {
      return false;
    }
  }

  private async generateSecureKey(): Promise<string> {
    const bytes = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('raw', bytes);
    return Buffer.from(exported).toString('base64url');
  }
} 