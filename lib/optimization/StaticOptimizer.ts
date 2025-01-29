import { Service } from 'typedi';
import { compress } from '~/lib/cache/compression';

const COMPRESSIBLE_TYPES = [
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'image/svg+xml',
  'text/xml',
  'application/xml'
];

@Service()
export class StaticOptimizer {
  private readonly compressionThreshold = 1024; // 1KB
  private readonly maxAge = 31536000; // 1 year in seconds
  private readonly immutableTypes = new Set([
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.webp'
  ]);

  async optimizeStaticResponse(request: Request, response: Response): Promise<Response> {
    const url = new URL(request.url);
    const extension = url.pathname.split('.').pop() || '';
    const contentType = response.headers.get('Content-Type') || '';

    // Set appropriate caching headers
    const headers = new Headers(response.headers);
    if (this.immutableTypes.has(`.${extension}`)) {
      headers.set('Cache-Control', `public, max-age=${this.maxAge}, immutable`);
    } else {
      headers.set('Cache-Control', `public, max-age=${this.maxAge}`);
    }

    // Check if compression is needed
    if (this.shouldCompress(contentType, response)) {
      const compressed = await this.compressResponse(response);
      headers.set('Content-Encoding', 'gzip');
      return new Response(compressed, {
        status: response.status,
        headers
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });
  }

  private shouldCompress(contentType: string, response: Response): boolean {
    if (!COMPRESSIBLE_TYPES.some(type => contentType.includes(type))) {
      return false;
    }

    const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
    return contentLength > this.compressionThreshold;
  }

  private async compressResponse(response: Response): Promise<Uint8Array> {
    const text = await response.text();
    return compress(text);
  }
}