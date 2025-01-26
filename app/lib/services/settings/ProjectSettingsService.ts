import { Service } from 'typedi';
import { DatabaseService } from '../database/DatabaseService';
import { CacheService } from '../cache/CacheService';
import { ProcessingError } from '~/errors/ProcessingError';
import type { 
  ProjectSettings, 
  SettingsUpdate,
  SettingsValidation,
  SettingsHistory 
} from '~/types/settings';

@Service()
export class ProjectSettingsService {
  private readonly cacheKeyPrefix = 'project:settings:';
  private readonly cacheTimeout = 3600; // 1 hour

  constructor(
    private readonly dbService: DatabaseService,
    private readonly cacheService: CacheService
  ) {}

  async getProjectSettings(projectId: string): Promise<ProjectSettings> {
    try {
      // Try cache first
      const cached = await this.cacheService.get<ProjectSettings>(
        this.getCacheKey(projectId)
      );
      if (cached) return cached;

      // Get from database
      const client = await this.dbService.getPostgresConnection();
      try {
        const result = await client.query(
          `SELECT settings, version, updated_at
           FROM project_settings 
           WHERE project_id = $1`,
          [projectId]
        );

        if (result.rows.length === 0) {
          return this.getDefaultSettings(projectId);
        }

        const settings = this.validateSettings(result.rows[0].settings);
        
        // Cache the result
        await this.cacheService.set(
          this.getCacheKey(projectId),
          settings,
          { ttl: this.cacheTimeout }
        );

        return settings;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new ProcessingError('Failed to retrieve project settings', error);
    }
  }

  async updateSettings(
    projectId: string,
    updates: SettingsUpdate
  ): Promise<ProjectSettings> {
    const client = await this.dbService.getPostgresConnection();
    try {
      await client.query('BEGIN');

      // Get current settings
      const current = await this.getProjectSettings(projectId);
      
      // Validate and merge updates
      const updated = this.mergeSettings(current, updates);
      const validation = this.validateSettingsUpdate(updated);
      
      if (!validation.isValid) {
        throw new ProcessingError(
          `Invalid settings: ${validation.errors.join(', ')}`
        );
      }

      // Store in database
      const result = await client.query(
        `INSERT INTO project_settings (
          project_id, settings, version, updated_at
        ) VALUES ($1, $2, $3, NOW())
        ON CONFLICT (project_id) 
        DO UPDATE SET 
          settings = $2,
          version = project_settings.version + 1,
          updated_at = NOW()
        RETURNING version`,
        [projectId, updated, 1]
      );

      // Store in history
      await client.query(
        `INSERT INTO project_settings_history (
          project_id, settings, version, created_at
        ) VALUES ($1, $2, $3, NOW())`,
        [projectId, updated, result.rows[0].version]
      );

      await client.query('COMMIT');

      // Invalidate cache
      await this.cacheService.invalidate(this.getCacheKey(projectId));

      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new ProcessingError('Failed to update project settings', error);
    } finally {
      client.release();
    }
  }

  async getSettingsHistory(
    projectId: string,
    limit: number = 10
  ): Promise<SettingsHistory[]> {
    const client = await this.dbService.getPostgresConnection();
    try {
      const result = await client.query(
        `SELECT settings, version, created_at
         FROM project_settings_history
         WHERE project_id = $1
         ORDER BY version DESC
         LIMIT $2`,
        [projectId, limit]
      );

      return result.rows.map(row => ({
        settings: row.settings,
        version: row.version,
        createdAt: row.created_at
      }));
    } catch (error) {
      throw new ProcessingError('Failed to retrieve settings history', error);
    } finally {
      client.release();
    }
  }

  async revertToVersion(
    projectId: string,
    version: number
  ): Promise<ProjectSettings> {
    const client = await this.dbService.getPostgresConnection();
    try {
      await client.query('BEGIN');

      // Get settings version
      const result = await client.query(
        `SELECT settings
         FROM project_settings_history
         WHERE project_id = $1 AND version = $2`,
        [projectId, version]
      );

      if (result.rows.length === 0) {
        throw new ProcessingError(`Version ${version} not found`);
      }

      const settings = result.rows[0].settings;

      // Update current settings
      await client.query(
        `UPDATE project_settings
         SET settings = $1,
             version = version + 1,
             updated_at = NOW()
         WHERE project_id = $2`,
        [settings, projectId]
      );

      await client.query('COMMIT');

      // Invalidate cache
      await this.cacheService.invalidate(this.getCacheKey(projectId));

      return settings;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new ProcessingError('Failed to revert settings', error);
    } finally {
      client.release();
    }
  }

  private getCacheKey(projectId: string): string {
    return `${this.cacheKeyPrefix}${projectId}`;
  }

  private getDefaultSettings(projectId: string): ProjectSettings {
    return {
      projectId,
      general: {
        name: '',
        description: '',
        version: '1.0.0'
      },
      development: {
        framework: 'react',
        language: 'typescript',
        nodeVersion: '18.x'
      },
      deployment: {
        platform: 'gcp',
        region: 'us-central1',
        environment: 'development'
      },
      security: {
        authEnabled: true,
        apiKeyRequired: true
      },
      features: {
        analytics: true,
        monitoring: true,
        logging: true
      }
    };
  }

  private validateSettings(settings: any): ProjectSettings {
    // Implement validation logic
    const required = [
      'projectId',
      'general',
      'development',
      'deployment',
      'security',
      'features'
    ];

    for (const field of required) {
      if (!settings[field]) {
        throw new ProcessingError(`Missing required field: ${field}`);
      }
    }

    return settings;
  }

  private validateSettingsUpdate(
    settings: ProjectSettings
  ): SettingsValidation {
    const errors: string[] = [];

    // Validate general settings
    if (!settings.general.name) {
      errors.push('Project name is required');
    }

    // Validate development settings
    if (!['react', 'vue', 'angular'].includes(settings.development.framework)) {
      errors.push('Invalid framework');
    }

    // Validate deployment settings
    if (!['development', 'staging', 'production'].includes(
      settings.deployment.environment
    )) {
      errors.push('Invalid environment');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private mergeSettings(
    current: ProjectSettings,
    updates: SettingsUpdate
  ): ProjectSettings {
    return {
      ...current,
      ...updates,
      // Ensure nested objects are properly merged
      general: { ...current.general, ...updates.general },
      development: { ...current.development, ...updates.development },
      deployment: { ...current.deployment, ...updates.deployment },
      security: { ...current.security, ...updates.security },
      features: { ...current.features, ...updates.features }
    };
  }
} 