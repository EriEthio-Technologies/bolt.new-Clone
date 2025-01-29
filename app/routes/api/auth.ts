import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Container } from 'typedi';
import { AuthService } from '~/lib/services/auth/AuthService';
import { validateAuthRequest } from '~/utils/validation';
import { AuthError } from '~/errors/AuthError';

import { rateLimitMiddleware } from '~/middleware/rateLimit';

export async function action({ request, context }: ActionFunctionArgs) {
  await rateLimitMiddleware(request, context);
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { provider, code } = await validateAuthRequest(await request.json());
    const authService = Container.get(AuthService);
    const response = await authService.authenticateWithProvider(provider, code);

    return json(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return json({ error: error.message }, { status: 401 });
    }
    return json({ error: 'Internal server error' }, { status: 500 });
  }
} 