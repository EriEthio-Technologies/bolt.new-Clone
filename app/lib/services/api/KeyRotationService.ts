import { Service } from 'typedi';
import { APIKeyService } from './APIKeyService';
import { validateEnv } from '~/config/env.server';
import type { APIKey } from '~/types/api';
import { APIKeyError } from '~/errors/APIKeyError';

@Service()
export class KeyRotationService {
  constructor(private readonly apiKeyService: APIKeyService) {}

  async rotateExpiredKeys(): Promise<void> {
    const env = validateEnv();
    const secretManager = this.apiKeyService.getSecretManager();
    
    try {
      // List all secrets
      const [secrets] = await secretManager.listSecrets({
        parent: `projects/${env.GCP_PROJECT_ID}`
      });

      for (const secret of secrets) {
        if (!secret.name.startsWith('api-key-')) continue;

        const [versions] = await secretManager.listSecretVersions({
          parent: secret.name
        });

        for (const version of versions) {
          if (this.isExpired(version.createTime)) {
            await this.rotateKey(secret.name);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to rotate keys:', error);
      throw new APIKeyError('Key rotation failed', 'ROTATION_FAILED', error);
    }
  }

  private isExpired(createTime: Date): boolean {
    const env = validateEnv();
    const expirationMs = env.API_KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - createTime.getTime() > expirationMs;
  }

  private async rotateKey(secretName: string): Promise<void> {
    // Extract userId from secret name
    const userId = secretName.split('-')[2];
    
    // Get existing key details
    const [version] = await this.apiKeyService.getSecretManager()
      .accessSecretVersion({ name: `${secretName}/versions/latest` });
    
    const existingKey = JSON.parse(version.payload.data.toString());
    
    // Create new key with same scopes
    const newKey = await this.apiKeyService.createAPIKey(
      userId,
      existingKey.scopes
    );

    // Disable old key version
    await this.apiKeyService.getSecretManager()
      .disableSecretVersion({ name: version.name });
  }
} 