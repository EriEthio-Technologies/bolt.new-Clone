import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ResourcePool, PoolConfig } from '../ResourcePool';

describe('ResourcePool', () => {
  let pool: ResourcePool;
  const config: PoolConfig = {
    maxSize: 5,
    minSize: 2,
    acquireTimeoutMs: 1000,
    idleTimeoutMs: 5000
  };

  beforeEach(() => {
    pool = ResourcePool.getInstance(config);
  });

  describe('getInstance', () => {
    it('should always return the same instance', () => {
      const instance1 = ResourcePool.getInstance(config);
      const instance2 = ResourcePool.getInstance(config);
      expect(instance1).toBe(instance2);
    });
  });

  describe('acquireResource', () => {
    it('should provide a resource when available', async () => {
      const resource = await pool.acquireResource();
      expect(resource).toBeDefined();
      expect(resource.inUse).toBe(true);
    });

    it('should queue requests when at max capacity', async () => {
      const resources = await Promise.all(
        Array(config.maxSize).fill(0).map(() => pool.acquireResource())
      );
      
      const acquirePromise = pool.acquireResource();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      );

      await expect(Promise.race([acquirePromise, timeoutPromise]))
        .rejects.toThrow('Timeout');
    });
  });

  describe('releaseResource', () => {
    it('should make resource available again after release', async () => {
      const resource = await pool.acquireResource();
      pool.releaseResource(resource.id);
      
      const nextResource = await pool.acquireResource();
      expect(nextResource.id).toBe(resource.id);
    });

    it('should handle waiting requests when resource is released', async () => {
      // Fill the pool
      const resources = await Promise.all(
        Array(config.maxSize).fill(0).map(() => pool.acquireResource())
      );

      // Queue up a waiting request
      const waitingPromise = pool.acquireResource();
      
      // Release a resource
      pool.releaseResource(resources[0].id);

      // Waiting request should get the released resource
      const acquiredResource = await waitingPromise;
      expect(acquiredResource.id).toBe(resources[0].id);
    });
  });

  describe('maintenance', () => {
    it('should cleanup idle resources above minSize', async () => {
      const resources = await Promise.all(
        Array(config.maxSize).fill(0).map(() => pool.acquireResource())
      );

      // Release all resources
      resources.forEach(r => pool.releaseResource(r.id));

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, config.idleTimeoutMs + 100));

      const activeResources = Array.from((pool as any).resources.values());
      expect(activeResources.length).toBe(config.minSize);
    });
  });
});