import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  
  // OAuth Configuration
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string().url(),
  
  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  
  // Security Configuration
  ALLOWED_ORIGINS: z.string(),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Database Configuration
  DATABASE_URL: z.string().url(),
  
  // GCP Configuration
  GCP_PROJECT_ID: z.string(),
  GCP_REGION: z.string(),
  
  // AT Protocol Configuration
  AT_PROTOCOL_KEY: z.string(),
  AT_PROTOCOL_HOST: z.string().url(),
  
  // API Configuration
  API_KEY_ROTATION_DAYS: z.number().default(30),
  API_KEY_MAX_REQUESTS: z.number().default(10000)
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error.errors);
    process.exit(1);
  }
} 