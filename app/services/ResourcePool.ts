import { EventEmitter } from 'events';

export interface PoolConfig {
  maxSize: number;
  minSize: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
}

export interface PoolResource {
  id: string;
  lastUsed: Date;
  inUse: boolean;
  resource: any;
}

export class ResourcePool extends EventEmitter {
  private static instance: ResourcePool;
  private resources: Map<string, PoolResource>;
  private waitingRequests: Array<(resource: PoolResource) => void>;
  
  private constructor(private config: PoolConfig) {
    super();
    this.resources = new Map();
    this.waitingRequests = [];
    this.startMaintenanceLoop();
  }

  public static getInstance(config: PoolConfig): ResourcePool {
    if (!ResourcePool.instance) {
      ResourcePool.instance = new ResourcePool(config);
    }
    return ResourcePool.instance;
  }

  public async acquireResource(): Promise<PoolResource> {
    // Try to get an available resource
    const available = Array.from(this.resources.values())
      .find(r => !r.inUse);

    if (available) {
      available.inUse = true;
      available.lastUsed = new Date();
      return available;
    }

    // Create new if under max size
    if (this.resources.size < this.config.maxSize) {
      const resource = await this.createResource();
      return resource;
    }

    // Wait for a resource to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Resource acquisition timeout'));
      }, this.config.acquireTimeoutMs);

      this.waitingRequests.push((resource: PoolResource) => {
        clearTimeout(timeout);
        resolve(resource);
      });
    });
  }

  public releaseResource(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return;
    }

    resource.inUse = false;
    resource.lastUsed = new Date();

    // Check if any requests are waiting
    const nextRequest = this.waitingRequests.shift();
    if (nextRequest) {
      resource.inUse = true;
      nextRequest(resource);
    }
  }

  private async createResource(): Promise<PoolResource> {
    const resource: PoolResource = {
      id: Math.random().toString(36).substring(7),
      lastUsed: new Date(),
      inUse: true,
      resource: {} // Replace with actual resource creation
    };

    this.resources.set(resource.id, resource);
    return resource;
  }

  private startMaintenanceLoop(): void {
    setInterval(() => {
      this.cleanupIdleResources();
    }, this.config.idleTimeoutMs);
  }

  private cleanupIdleResources(): void {
    const now = new Date();
    const minResources = this.config.minSize;

    Array.from(this.resources.entries())
      .filter(([_, resource]) => !resource.inUse)
      .sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime())
      .slice(minResources)
      .forEach(([id, resource]) => {
        if (now.getTime() - resource.lastUsed.getTime() > this.config.idleTimeoutMs) {
          this.resources.delete(id);
          this.emit('resourceReleased', resource);
        }
      });
  }
}