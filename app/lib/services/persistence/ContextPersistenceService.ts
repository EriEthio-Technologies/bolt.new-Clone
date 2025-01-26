import { Service } from 'typedi';
import { Storage } from '@google-cloud/storage';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { validateEnv } from '~/config/env.server';
import { execAsync } from '~/utils/execAsync';
import type { 
  DomainContext,
  ContextVersion,
  ContextPersistenceConfig,
  PersistenceMetadata 
} from '~/types/persistence';

@Service()
export class ContextPersistenceService {
  private readonly storage: Storage;
  private readonly env: ReturnType<typeof validateEnv>;
  private readonly localPath: string;
  private readonly bucketName: string;

  constructor() {
    this.env = validateEnv();
    this.storage = new Storage();
    this.localPath = join(process.cwd(), '.context');
    this.bucketName = `${this.env.GCP_PROJECT_ID}-context-store`;
  }

  async initialize(): Promise<void> {
    try {
      await mkdir(this.localPath, { recursive: true });
      await this.ensureGCPBucket();
      await this.initializeMetadata();
    } catch (error) {
      console.error('Failed to initialize context persistence:', error);
      throw new Error(`Context persistence initialization failed: ${error.message}`);
    }
  }

  async saveContext(
    context: DomainContext,
    config: ContextPersistenceConfig
  ): Promise<ContextVersion> {
    try {
      const version = await this.generateVersion();
      const metadata = await this.getMetadata();

      // Save locally
      await this.saveLocal(context, version);

      // Save to GCP if configured
      if (config.remoteBackup) {
        await this.saveRemote(context, version);
      }

      // Update metadata
      metadata.versions.push({
        version,
        timestamp: new Date(),
        hash: await this.calculateHash(context),
        config
      });
      await this.updateMetadata(metadata);

      return {
        version,
        timestamp: new Date(),
        config
      };
    } catch (error) {
      console.error('Failed to save context:', error);
      throw new Error(`Context save failed: ${error.message}`);
    }
  }

  async loadContext(version?: string): Promise<DomainContext> {
    try {
      const metadata = await this.getMetadata();
      const targetVersion = version || metadata.versions[metadata.versions.length - 1].version;

      // Try local first
      try {
        return await this.loadLocal(targetVersion);
      } catch {
        // If local fails, try remote
        return await this.loadRemote(targetVersion);
      }
    } catch (error) {
      console.error('Failed to load context:', error);
      throw new Error(`Context load failed: ${error.message}`);
    }
  }

  async listVersions(): Promise<ContextVersion[]> {
    try {
      const metadata = await this.getMetadata();
      return metadata.versions.map(v => ({
        version: v.version,
        timestamp: v.timestamp,
        config: v.config
      }));
    } catch (error) {
      console.error('Failed to list versions:', error);
      throw new Error(`Version listing failed: ${error.message}`);
    }
  }

  private async ensureGCPBucket(): Promise<void> {
    try {
      const [exists] = await this.storage
        .bucket(this.bucketName)
        .exists();

      if (!exists) {
        await this.storage.createBucket(this.bucketName, {
          location: 'US',
          storageClass: 'STANDARD'
        });
      }
    } catch (error) {
      console.error('Failed to ensure GCP bucket:', error);
      throw error;
    }
  }

  private async initializeMetadata(): Promise<void> {
    const metadataPath = join(this.localPath, 'metadata.json');
    try {
      await readFile(metadataPath);
    } catch {
      const initialMetadata: PersistenceMetadata = {
        versions: [],
        lastUpdated: new Date(),
        config: {
          remoteBackup: true,
          compressionEnabled: true,
          retentionDays: 30
        }
      };
      await writeFile(
        metadataPath,
        JSON.stringify(initialMetadata, null, 2)
      );
    }
  }

  private async getMetadata(): Promise<PersistenceMetadata> {
    const content = await readFile(
      join(this.localPath, 'metadata.json'),
      'utf-8'
    );
    return JSON.parse(content);
  }

  private async updateMetadata(metadata: PersistenceMetadata): Promise<void> {
    metadata.lastUpdated = new Date();
    await writeFile(
      join(this.localPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  private async generateVersion(): Promise<string> {
    const { stdout: hash } = await execAsync('git rev-parse HEAD');
    const timestamp = Date.now();
    return `${this.env.APP_VERSION}-${hash.slice(0, 7)}-${timestamp}`;
  }

  private async calculateHash(context: DomainContext): Promise<string> {
    const content = JSON.stringify(context);
    const { createHash } = await import('crypto');
    return createHash('sha256').update(content).digest('hex');
  }

  private async saveLocal(
    context: DomainContext,
    version: string
  ): Promise<void> {
    const path = join(this.localPath, `${version}.json`);
    await writeFile(path, JSON.stringify(context, null, 2));
  }

  private async loadLocal(version: string): Promise<DomainContext> {
    const path = join(this.localPath, `${version}.json`);
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  }

  private async saveRemote(
    context: DomainContext,
    version: string
  ): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`${version}.json`);
    
    await file.save(JSON.stringify(context), {
      contentType: 'application/json',
      metadata: {
        version,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async loadRemote(version: string): Promise<DomainContext> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`${version}.json`);
    
    const [content] = await file.download();
    return JSON.parse(content.toString());
  }
} 