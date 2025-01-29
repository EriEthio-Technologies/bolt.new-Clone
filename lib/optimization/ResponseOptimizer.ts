import { Service } from 'typedi';
import { hash } from 'object-hash';

interface CacheConfig {
  maxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  public?: boolean;
}

@Service()
export class ResponseOptimizer {
  setCacheHeaders(response: Response, config: CacheConfig = {}): Response {
    const cacheControl: string[] = [];
    
    if (config.public) {
      cacheControl.push('public');
    } else {
      cacheControl.push('private');
    }

    if (config.maxAge !== undefined) {
      cacheControl.push(`max-age=${config.maxAge}`);
    }

    if (config.staleWhileRevalidate !== undefined) {
      cacheControl.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }

    if (config.staleIfError !== undefined) {
      cacheControl.push(`stale-if-error=${config.staleIfError}`);
    }

    response.headers.set('Cache-Control', cacheControl.join(', '));

    // Set ETag for conditional requests
    if (!response.headers.has('ETag')) {
      const etag = this.generateETag(response);
      response.headers.set('ETag', etag);
    }

    // Set Vary header for proper caching
    if (!response.headers.has('Vary')) {
      response.headers.set('Vary', 'Accept-Encoding');
    }

    return response;
  }

  handleConditionalRequest(request: Request, response: Response): Response {
    const ifNoneMatch = request.headers.get('If-None-Match');
    const etag = response.headers.get('ETag');

    if (ifNoneMatch && etag && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          'Cache-Control': response.headers.get('Cache-Control')!,
          'ETag': etag
        }
      });
    }

    return response;
  }

  private generateETag(response: Response): string {
    // Generate ETag based on response content and headers
    const content = response.clone().text();
    const headers = Array.from(response.headers.entries());
    return `"${hash({ content, headers })}"`;
  }
}