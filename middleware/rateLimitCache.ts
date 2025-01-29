import { LRUCache } from 'lru-cache';
import { validateEnv } from '~/config/env.server';

const env = validateEnv();

interface RateLimitState {
  count: number;
  resetTime: number;
}

// In-memory LRU cache to reduce KV store operations
const cache = new LRUCache<string, RateLimitState>({
  max: 10000, // Maximum number of items to store
  ttl: 1000 * 60 * 60, // Items expire after 1 hour
  updateAgeOnGet: true,
});

export async function getRateLimitState(
  key: string,
  store: KVNamespace
): Promise<RateLimitState | null> {
  // Try cache first
  const cachedState = cache.get(key);
  if (cachedState) {
    return cachedState;
  }

  // Fall back to KV store
  const stateJson = await store.get(key);
  if (stateJson) {
    const state = JSON.parse(stateJson);
    cache.set(key, state);
    return state;
  }

  return null;
}

export async function setRateLimitState(
  key: string,
  state: RateLimitState,
  store: KVNamespace,
  expirationTtl: number
): Promise<void> {
  // Update cache
  cache.set(key, state);

  // Update KV store
  await store.put(key, JSON.stringify(state), { expirationTtl });
}