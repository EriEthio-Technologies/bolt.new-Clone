export interface Env {
  NODE_ENV: string;
  AUTH_RATE_LIMIT_WINDOW_MS?: number;
  AUTH_RATE_LIMIT_MAX_REQUESTS?: number;
  UNAUTH_RATE_LIMIT_WINDOW_MS?: number;
  UNAUTH_RATE_LIMIT_MAX_REQUESTS?: number;
  // ... other env vars
}

export function validateEnv(): Env {
  const env = process.env as unknown as Env;

  // Validate required env vars...
  
  return env;
}