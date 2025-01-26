import { Service } from 'typedi';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { validateEnv } from '~/config/env.server';
import { execAsync } from '~/utils/execAsync';
import { ContextPersistenceService } from '../persistence/ContextPersistenceService';
import type { 
  DomainContext,
  ContextVersion,
  VersionBranch,
  VersionMergeResult,
  VersionDiff,
  VersionMetadata 
} from '~/types/versioning';

@Service()
export class ContextVersioningService {
  private readonly env: ReturnType<typeof validateEnv>;
  private readonly versionPath: string;

  constructor(
    private readonly persistenceService: ContextPersistenceService
  ) {
    this.env = validateEnv();
    this.versionPath = join(process.cwd(), '.context/versions');
  }

  async createVersion(
    context: DomainContext,
    branch: string = 'main'
  ): Promise<ContextVersion> {
    try {
      const metadata = await this.getVersionMetadata();
      const version = await this.generateVersion(branch);
      const previousVersion = await this.getLatestVersion(branch);

      // Calculate diff from previous version
      const diff = previousVersion ? 
        await this.calculateDiff(previousVersion.context, context) : 
        null;

      // Create version entry
      const versionEntry: ContextVersion = {
        version,
        branch,
        timestamp: new Date(),
        context,
        diff,
        metadata: {
          author: await this.getGitAuthor(),
          message: await this.getCommitMessage(),
          tags: [],
          parent: previousVersion?.version
        }
      };

      // Update branch pointer
      metadata.branches[branch] = version;
      await this.updateVersionMetadata(metadata);

      // Save version
      await this.saveVersion(versionEntry);

      return versionEntry;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw new Error(`Version creation failed: ${error.message}`);
    }
  }

  async createBranch(
    name: string,
    fromVersion?: string
  ): Promise<VersionBranch> {
    try {
      const metadata = await this.getVersionMetadata();
      
      if (metadata.branches[name]) {
        throw new Error(`Branch ${name} already exists`);
      }

      const sourceVersion = fromVersion || metadata.branches.main;
      if (!sourceVersion) {
        throw new Error('Source version not found');
      }

      const version = await this.loadVersion(sourceVersion);
      metadata.branches[name] = sourceVersion;
      await this.updateVersionMetadata(metadata);

      return {
        name,
        head: sourceVersion,
        base: 'main',
        created: new Date(),
        author: await this.getGitAuthor()
      };
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw new Error(`Branch creation failed: ${error.message}`);
    }
  }

  async mergeBranches(
    source: string,
    target: string = 'main'
  ): Promise<VersionMergeResult> {
    try {
      const metadata = await this.getVersionMetadata();
      
      const sourceVersion = metadata.branches[source];
      const targetVersion = metadata.branches[target];

      if (!sourceVersion || !targetVersion) {
        throw new Error('Branch not found');
      }

      const sourceContext = await this.loadVersion(sourceVersion);
      const targetContext = await this.loadVersion(targetVersion);

      // Merge contexts
      const mergedContext = await this.mergeContexts(
        sourceContext,
        targetContext
      );

      // Create merge version
      const mergeVersion = await this.createVersion(
        mergedContext.context,
        target
      );

      return {
        success: true,
        version: mergeVersion.version,
        conflicts: mergedContext.conflicts
      };
    } catch (error) {
      console.error('Failed to merge branches:', error);
      throw new Error(`Branch merge failed: ${error.message}`);
    }
  }

  async getVersionHistory(
    branch: string = 'main'
  ): Promise<ContextVersion[]> {
    try {
      const metadata = await this.getVersionMetadata();
      const currentVersion = metadata.branches[branch];

      if (!currentVersion) {
        return [];
      }

      const history: ContextVersion[] = [];
      let version = currentVersion;

      while (version) {
        const versionEntry = await this.loadVersion(version);
        history.push(versionEntry);
        version = versionEntry.metadata.parent;
      }

      return history;
    } catch (error) {
      console.error('Failed to get version history:', error);
      throw new Error(`Version history retrieval failed: ${error.message}`);
    }
  }

  private async calculateDiff(
    previous: DomainContext,
    current: DomainContext
  ): Promise<VersionDiff> {
    // Implementation of context diffing logic
    // This is a simplified version - you might want to use a more sophisticated diffing algorithm
    const changes: VersionDiff = {
      entities: {
        added: [],
        modified: [],
        removed: []
      },
      services: {
        added: [],
        modified: [],
        removed: []
      },
      dependencies: {
        added: [],
        removed: []
      }
    };

    // Compare entities
    const prevEntities = new Set(previous.entities.map(e => e.name));
    const currEntities = new Set(current.entities.map(e => e.name));

    changes.entities.added = current.entities
      .filter(e => !prevEntities.has(e.name));
    changes.entities.removed = previous.entities
      .filter(e => !currEntities.has(e.name));
    changes.entities.modified = current.entities
      .filter(e => 
        prevEntities.has(e.name) && 
        JSON.stringify(e) !== JSON.stringify(
          previous.entities.find(pe => pe.name === e.name)
        )
      );

    // Similar logic for services and dependencies
    // ... implementation omitted for brevity

    return changes;
  }

  private async mergeContexts(
    source: ContextVersion,
    target: ContextVersion
  ): Promise<{ context: DomainContext; conflicts: string[] }> {
    const conflicts: string[] = [];
    const merged: DomainContext = {
      ...target.context,
      entities: [],
      services: [],
      dependencies: {
        nodes: new Map(),
        edges: []
      }
    };

    // Merge entities
    const entityMap = new Map();
    target.context.entities.forEach(e => entityMap.set(e.name, e));
    source.context.entities.forEach(e => {
      const existing = entityMap.get(e.name);
      if (existing && JSON.stringify(e) !== JSON.stringify(existing)) {
        conflicts.push(`Entity conflict: ${e.name}`);
      }
      entityMap.set(e.name, e);
    });
    merged.entities = Array.from(entityMap.values());

    // Similar logic for services and dependencies
    // ... implementation omitted for brevity

    return { context: merged, conflicts };
  }

  private async generateVersion(branch: string): Promise<string> {
    const { stdout: hash } = await execAsync('git rev-parse HEAD');
    const timestamp = Date.now();
    return `${branch}-${hash.slice(0, 7)}-${timestamp}`;
  }

  private async getGitAuthor(): Promise<string> {
    const { stdout } = await execAsync('git config user.name');
    return stdout.trim();
  }

  private async getCommitMessage(): Promise<string> {
    const { stdout } = await execAsync('git log -1 --pretty=%B');
    return stdout.trim();
  }

  private async getVersionMetadata(): Promise<VersionMetadata> {
    try {
      const content = await readFile(
        join(this.versionPath, 'metadata.json'),
        'utf-8'
      );
      return JSON.parse(content);
    } catch {
      return {
        branches: { main: null },
        tags: {},
        lastUpdated: new Date()
      };
    }
  }

  private async updateVersionMetadata(
    metadata: VersionMetadata
  ): Promise<void> {
    metadata.lastUpdated = new Date();
    await writeFile(
      join(this.versionPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  private async saveVersion(
    version: ContextVersion
  ): Promise<void> {
    await writeFile(
      join(this.versionPath, `${version.version}.json`),
      JSON.stringify(version, null, 2)
    );
  }

  private async loadVersion(
    version: string
  ): Promise<ContextVersion> {
    const content = await readFile(
      join(this.versionPath, `${version}.json`),
      'utf-8'
    );
    return JSON.parse(content);
  }
} 