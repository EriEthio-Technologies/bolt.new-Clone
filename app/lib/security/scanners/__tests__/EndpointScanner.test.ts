import { EndpointScanner } from '../EndpointScanner';
import { DebugService } from '../../../debug/DebugService';
import { Router } from 'express';

jest.mock('../../../debug/DebugService');

describe('EndpointScanner', () => {
  let scanner: EndpointScanner;
  let mockDebug: jest.Mocked<DebugService>;
  let mockRouter: Router;

  beforeEach(() => {
    mockDebug = {
      log: jest.fn()
    } as any;

    mockRouter = {
      stack: [
        {
          route: {
            path: '/test',
            methods: { get: true }
          }
        },
        {
          route: {
            path: '/api/data',
            methods: { post: true, put: true }
          }
        }
      ]
    } as any;

    scanner = new EndpointScanner(mockDebug);
  });

  describe('scanEndpoints', () => {
    it('scans all endpoints in router', async () => {
      const results = await scanner.scanEndpoints(mockRouter);

      expect(results).toHaveLength(3); // One GET + One POST + One PUT
      expect(results).toContainEqual(expect.objectContaining({
        path: '/test',
        method: 'GET'
      }));
      expect(results).toContainEqual(expect.objectContaining({
        path: '/api/data',
        method: 'POST'
      }));
    });

    it('includes security headers check', async () => {
      const results = await scanner.scanEndpoints(mockRouter);

      results.forEach(result => {
        expect(result.securityHeaders).toBeDefined();
        expect(Array.isArray(result.securityHeaders)).toBe(true);
      });
    });

    it('detects authentication requirements', async () => {
      const results = await scanner.scanEndpoints(mockRouter);

      const apiEndpoint = results.find(r => r.path === '/api/data');
      expect(apiEndpoint?.authenticationRequired).toBe(true);
    });

    it('handles router errors', async () => {
      const error = new Error('Router scan failed');
      const badRouter = {
        stack: null
      } as any;

      await expect(scanner.scanEndpoints(badRouter)).rejects.toThrow();
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'EndpointScanner',
        'Failed to scan endpoints',
        expect.any(Object)
      );
    });
  });
}); 