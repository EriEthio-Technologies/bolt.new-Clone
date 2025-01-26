import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Container } from 'typedi';
import { APIKeyService } from '~/lib/services/api/APIKeyService';
import { validateAPIKeyRequest } from '~/utils/validation';
import { authMiddleware } from '~/middleware/auth';
import { APIKeyError } from '~/errors/APIKeyError';

export async function action({ request }: ActionFunctionArgs) {
  await authMiddleware(request);

  if (request.method === 'POST') {
    try {
      const { userId, scopes } = await validateAPIKeyRequest(await request.json());
      const apiKeyService = Container.get(APIKeyService);
      const apiKey = await apiKeyService.createAPIKey(userId, scopes);

      return json({
        key: apiKey.key,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt.toISOString()
      });
    } catch (error) {
      if (error instanceof APIKeyError) {
        return json({ error: error.message }, { status: 400 });
      }
      return json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
} 