import { z } from 'zod';
import type { OAuthProvider } from '~/types/auth';

const authRequestSchema = z.object({
  provider: z.enum(['google', 'github'] as const),
  code: z.string().min(1)
});

export async function validateAuthRequest(data: unknown) {
  return authRequestSchema.parseAsync(data);
}

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  picture: z.string().url().optional(),
  provider: z.enum(['google', 'github'] as const),
  providerId: z.string()
});

const apiKeyRequestSchema = z.object({
  userId: z.string().min(1),
  scopes: z.array(z.enum(['read', 'write', 'admin']))
});

export async function validateAPIKeyRequest(data: unknown) {
  return apiKeyRequestSchema.parseAsync(data);
} 