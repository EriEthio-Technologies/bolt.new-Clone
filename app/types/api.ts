export type APIKeyScope = 'read' | 'write' | 'admin';

export interface APIKey {
  key: string;
  scopes: APIKeyScope[];
  createdAt: Date;
  expiresAt: Date;
}

export interface APIKeyCreateRequest {
  userId: string;
  scopes: APIKeyScope[];
}

export interface APIKeyResponse {
  key: string;
  scopes: APIKeyScope[];
  expiresAt: string;
}

export interface APIMetrics {
  method: string;
  endpoint: string;
  status: number;
  latency: number;
  userId?: string;
  apiKeyId?: string;
}

export interface APIUsage {
  requests: number;
  lastUsed: Date;
  quotaRemaining: number;
} 