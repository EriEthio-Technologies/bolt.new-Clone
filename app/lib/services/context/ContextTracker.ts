import { Service } from 'typedi';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execAsync } from '~/utils/execAsync';
import { validateEnv } from '~/config/env.server';
import { DomainContextExtractor } from './DomainContextExtractor';
import type { 
  DomainContext,
  ContextChange,
  ContextVersion,
  ContextDiff,
  ContextSnapshot 
} from '~/types/context';

@Service()
export class ContextTracker {
  private readonly env: ReturnType<typeof validateEnv>;
  private readonly contextPath: string;
  private readonly snapshotsPath: string;

  constructor(
    private readonly extractor: DomainContextExtractor
  ) {
    this.env = validateEnv();
    this.contextPath = join(process.cwd(), '.context');
    this.snapshotsPath = join(this.contextPath, 'snapshots');
  }

  async trackChanges(rootPath: string): Promise<ContextChange[]> {
    try {
      // Get current context
      const currentContext = await this.extractor.extractContext(rootPath);
      
      // Load previous context
      const previousContext = await this.loadLatestContext();
      
      if (!previousContext) {
        await this.saveContext(currentContext);
        return [];
      }

      // Compare contexts and identify changes
      const changes = await this.detectChanges(previousContext, currentContext);
      
      if (changes.length > 0) {
        // Save new context and changes
        await this.saveContext(currentContext);
        await this.saveChanges(changes);
        
        // Create snapshot if significant changes
        if (this.isSignificantChange(changes)) {
          await this.createSnapshot(currentContext, changes);
        }
      }

      return changes;
    } catch (error) {
      console.error('Failed to track context changes:', error);
      throw new Error(`Context tracking failed: ${error.message}`);
    }
  }

  private async loadLatestContext(): Promise<DomainContext | null> {
    try {
      const contextFile = join(this.contextPath, 'latest.json');
      const content = await readFile(contextFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async saveContext(context: DomainContext): Promise<void> {
    await writeFile(
      join(this.contextPath, 'latest.json'),
      JSON.stringify(context, null, 2)
    );
  }

  private async detectChanges(
    previous: DomainContext,
    current: DomainContext
  ): Promise<ContextChange[]> {
    const changes: ContextChange[] = [];

    // Check for entity changes
    const entityChanges = this.compareEntities(previous.entities, current.entities);
    changes.push(...entityChanges);

    // Check for service changes
    const serviceChanges = this.compareServices(previous.services, current.services);
    changes.push(...serviceChanges);

    // Check for dependency changes
    const dependencyChanges = this.compareDependencies(
      previous.dependencies,
      current.dependencies
    );
    changes.push(...dependencyChanges);

    // Enrich changes with git information
    await this.enrichChangesWithGitInfo(changes);

    return changes;
  }

  private compareEntities(previous: any[], current: any[]): ContextChange[] {
    const changes: ContextChange[] = [];
    const previousMap = new Map(previous.map(e => [e.name, e]));
    const currentMap = new Map(current.map(e => [e.name, e]));

    // Find added and modified entities
    currentMap.forEach((entity, name) => {
      if (!previousMap.has(name)) {
        changes.push({
          type: 'entity',
          action: 'added',
          name,
          file: entity.file,
          details: { entity }
        });
      } else if (JSON.stringify(entity) !== JSON.stringify(previousMap.get(name))) {
        changes.push({
          type: 'entity',
          action: 'modified',
          name,
          file: entity.file,
          details: {
            before: previousMap.get(name),
            after: entity
          }
        });
      }
    });

    // Find removed entities
    previousMap.forEach((entity, name) => {
      if (!currentMap.has(name)) {
        changes.push({
          type: 'entity',
          action: 'removed',
          name,
          file: entity.file,
          details: { entity }
        });
      }
    });

    return changes;
  }

  private compareServices(previous: any[], current: any[]): ContextChange[] {
    const changes: ContextChange[] = [];
    const previousMap = new Map(previous.map(s => [s.name, s]));
    const currentMap = new Map(current.map(s => [s.name, s]));

    // Find added and modified services
    currentMap.forEach((service, name) => {
      if (!previousMap.has(name)) {
        changes.push({
          type: 'service',
          action: 'added',
          name,
          file: service.file,
          details: { service }
        });
      } else {
        const previousService = previousMap.get(name)!;
        
        // Check for method changes
        const methodChanges = this.compareServiceMethods(
          previousService.methods,
          service.methods
        );
        if (methodChanges.length > 0) {
          changes.push({
            type: 'service',
            action: 'modified',
            name,
            file: service.file,
            details: {
              methodChanges,
              before: previousService,
              after: service
            }
          });
        }

        // Check for dependency changes
        if (JSON.stringify(previousService.dependencies) !== 
            JSON.stringify(service.dependencies)) {
          changes.push({
            type: 'service',
            action: 'dependencies_changed',
            name,
            file: service.file,
            details: {
              before: previousService.dependencies,
              after: service.dependencies
            }
          });
        }
      }
    });

    // Find removed services
    previousMap.forEach((service, name) => {
      if (!currentMap.has(name)) {
        changes.push({
          type: 'service',
          action: 'removed',
          name,
          file: service.file,
          details: { service }
        });
      }
    });

    return changes;
  }

  private compareServiceMethods(previous: any[], current: any[]): any[] {
    const changes = [];
    const previousMap = new Map(previous.map(m => [m.name, m]));
    const currentMap = new Map(current.map(m => [m.name, m]));

    // Check for added and modified methods
    currentMap.forEach((method, name) => {
      if (!previousMap.has(name)) {
        changes.push({
          type: 'method_added',
          name,
          method
        });
      } else if (JSON.stringify(method) !== JSON.stringify(previousMap.get(name))) {
        changes.push({
          type: 'method_modified',
          name,
          before: previousMap.get(name),
          after: method
        });
      }
    });

    // Check for removed methods
    previousMap.forEach((method, name) => {
      if (!currentMap.has(name)) {
        changes.push({
          type: 'method_removed',
          name,
          method
        });
      }
    });

    return changes;
  }

  private compareDependencies(previous: any, current: any): ContextChange[] {
    const changes: ContextChange[] = [];
    const previousEdges = new Set(previous.edges.map(e => 
      `${e.from}:${e.to}:${e.type}`
    ));
    const currentEdges = new Set(current.edges.map(e => 
      `${e.from}:${e.to}:${e.type}`
    ));

    // Find added dependencies
    current.edges.forEach((edge: any) => {
      const key = `${edge.from}:${edge.to}:${edge.type}`;
      if (!previousEdges.has(key)) {
        changes.push({
          type: 'dependency',
          action: 'added',
          name: `${edge.from} -> ${edge.to}`,
          file: edge.from,
          details: { edge }
        });
      }
    });

    // Find removed dependencies
    previous.edges.forEach((edge: any) => {
      const key = `${edge.from}:${edge.to}:${edge.type}`;
      if (!currentEdges.has(key)) {
        changes.push({
          type: 'dependency',
          action: 'removed',
          name: `${edge.from} -> ${edge.to}`,
          file: edge.from,
          details: { edge }
        });
      }
    });

    return changes;
  }

  private async enrichChangesWithGitInfo(changes: ContextChange[]): Promise<void> {
    try {
      for (const change of changes) {
        if (!change.file) continue;

        // Get last commit info for the file
        const { stdout: commitInfo } = await execAsync(
          `git log -1 --format="%H|%an|%ae|%at|%s" ${change.file}`
        );

        if (commitInfo) {
          const [hash, author, email, timestamp, message] = commitInfo.split('|');
          change.git = {
            commit: hash,
            author,
            email,
            timestamp: new Date(parseInt(timestamp) * 1000),
            message
          };
        }
      }
    } catch (error) {
      console.warn('Failed to enrich changes with git info:', error);
    }
  }

  private isSignificantChange(changes: ContextChange[]): boolean {
    // Consider a change significant if it meets certain criteria
    return changes.some(change => 
      change.action === 'added' || 
      change.action === 'removed' ||
      (change.type === 'service' && change.action === 'modified')
    );
  }

  private async createSnapshot(
    context: DomainContext,
    changes: ContextChange[]
  ): Promise<void> {
    const snapshot: ContextSnapshot = {
      context,
      changes,
      timestamp: new Date(),
      version: await this.getNextVersion()
    };

    await writeFile(
      join(this.snapshotsPath, `${snapshot.version}.json`),
      JSON.stringify(snapshot, null, 2)
    );
  }

  private async getNextVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD');
      const shortHash = stdout.slice(0, 7);
      return `${this.env.APP_VERSION}-${shortHash}`;
    } catch {
      return `${this.env.APP_VERSION}-${Date.now()}`;
    }
  }

  async getContextHistory(): Promise<ContextVersion[]> {
    try {
      const snapshots = await this.loadSnapshots();
      return snapshots.map(snapshot => ({
        version: snapshot.version,
        timestamp: snapshot.timestamp,
        changes: snapshot.changes.length,
        significant: this.isSignificantChange(snapshot.changes)
      }));
    } catch (error) {
      console.error('Failed to get context history:', error);
      return [];
    }
  }

  private async loadSnapshots(): Promise<ContextSnapshot[]> {
    try {
      const files = await readdir(this.snapshotsPath);
      const snapshots = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async f => {
            const content = await readFile(
              join(this.snapshotsPath, f),
              'utf-8'
            );
            return JSON.parse(content);
          })
      );

      return snapshots.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  async getDiff(fromVersion: string, toVersion: string): Promise<ContextDiff> {
    try {
      const snapshots = await this.loadSnapshots();
      const fromSnapshot = snapshots.find(s => s.version === fromVersion);
      const toSnapshot = snapshots.find(s => s.version === toVersion);

      if (!fromSnapshot || !toSnapshot) {
        throw new Error('Version not found');
      }

      return {
        from: fromVersion,
        to: toVersion,
        timestamp: new Date(),
        changes: await this.detectChanges(
          fromSnapshot.context,
          toSnapshot.context
        )
      };
    } catch (error) {
      console.error('Failed to get context diff:', error);
      throw new Error(`Context diff failed: ${error.message}`);
    }
  }
} 