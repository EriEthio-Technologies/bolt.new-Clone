import { Service } from 'typedi';
import { DebugService } from '../../debug/DebugService';
import { Router } from 'express';

export interface EndpointValidationResult {
  path: string;
  method: string;
  vulnerabilities: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    remediation: string;
  }[];
  securityHeaders: {
    name: string;
    present: boolean;
    value?: string;
  }[];
  authenticationRequired: boolean;
  rateLimited: boolean;
}

@Service()
export class EndpointScanner {
  constructor(private debug: DebugService) {}

  async scanEndpoints(router: Router): Promise<EndpointValidationResult[]> {
    try {
      const endpoints: EndpointValidationResult[] = [];

      // Get all registered routes
      const routes = this.getRoutes(router);

      for (const route of routes) {
        const validation = await this.validateEndpoint(route);
        endpoints.push(validation);
      }

      return endpoints;
    } catch (error) {
      this.debug.log('error', 'EndpointScanner', 'Failed to scan endpoints', { error });
      throw error;
    }
  }

  private getRoutes(router: Router): { path: string; method: string }[] {
    const routes: { path: string; method: string }[] = [];
    
    router.stack.forEach(layer => {
      if (layer.route) {
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods);
        methods.forEach(method => {
          routes.push({ path, method: method.toUpperCase() });
        });
      }
    });

    return routes;
  }

  private async validateEndpoint(route: { path: string; method: string }): Promise<EndpointValidationResult> {
    // Implement endpoint validation logic
    return {
      path: route.path,
      method: route.method,
      vulnerabilities: [],
      securityHeaders: [],
      authenticationRequired: false,
      rateLimited: false
    };
  }
} 