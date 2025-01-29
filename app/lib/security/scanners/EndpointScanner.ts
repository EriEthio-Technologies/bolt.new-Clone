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
      const routes = this.getRoutes(router);
      const results = await Promise.all(
        routes.map(route => this.validateEndpoint(route))
      );
      
      // Log scanning results
      this.debug.log('Endpoint scanning completed', {
        totalEndpoints: results.length,
        vulnerabilities: results.flatMap(r => r.vulnerabilities)
      });
      
      return results;
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
    const vulnerabilities: EndpointValidationResult['vulnerabilities'] = [];
    const securityHeaders: EndpointValidationResult['securityHeaders'] = [];
    
    // Check if endpoint requires authentication
    const authenticationRequired = this.checkAuthenticationRequired(route);
    
    // Check if endpoint is rate limited
    const rateLimited = this.checkRateLimiting(route);
    
    // Check required security headers
    this.validateSecurityHeaders(securityHeaders);
    
    // Check for common vulnerabilities
    await this.checkVulnerabilities(route, vulnerabilities);
    
    return {
      path: route.path,
      method: route.method,
      vulnerabilities,
      securityHeaders,
      authenticationRequired,
      rateLimited
    };
  }

  private checkAuthenticationRequired(route: { path: string; method: string }): boolean {
    // List of paths that don't require authentication
    const publicPaths = ['/health', '/metrics', '/login', '/register'];
    if (publicPaths.includes(route.path)) {
      return false;
    }
    return true;
  }

  private checkRateLimiting(route: { path: string; method: string }): boolean {
    // Check if endpoint has rate limiting middleware
    const rateLimitedPaths = ['*']; // All paths are rate limited by default
    const excludedPaths = ['/health', '/metrics'];
    
    return !excludedPaths.includes(route.path);
  }

  private validateSecurityHeaders(headers: EndpointValidationResult['securityHeaders']): void {
    const { REQUIRED_SECURITY_HEADERS } = require('./SecurityHeaderCheck');
    
    for (const requiredHeader of REQUIRED_SECURITY_HEADERS) {
      const headerValue = headers.find(h => h.name === requiredHeader.name)?.value;
      const present = headerValue != null;
      
      headers.push({
        name: requiredHeader.name,
        present,
        value: headerValue
      });

      if (requiredHeader.required && !present) {
        this.vulnerabilities.push({
          id: `missing-security-header-${requiredHeader.name.toLowerCase()}`,
          severity: 'high',
          description: `Missing required security header: ${requiredHeader.name}`,
          remediation: `Add the ${requiredHeader.name} header to all responses`
        });
      } else if (present && requiredHeader.validator && !requiredHeader.validator(headerValue!)) {
        this.vulnerabilities.push({
          id: `invalid-security-header-${requiredHeader.name.toLowerCase()}`,
          severity: 'medium',
          description: `Invalid value for security header: ${requiredHeader.name}`,
          remediation: `Update the ${requiredHeader.name} header to use a valid value`
        });
      }
    }
    const requiredHeaders = [
      { name: 'Content-Security-Policy', value: "default-src 'self'" },
      { name: 'X-Content-Type-Options', value: 'nosniff' },
      { name: 'X-Frame-Options', value: 'DENY' },
      { name: 'X-XSS-Protection', value: '1; mode=block' },
      { name: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { name: 'Referrer-Policy', value: 'same-origin' }
    ];

    requiredHeaders.forEach(header => {
      headers.push({
        name: header.name,
        present: true, // Will be validated at runtime
        value: header.value
      });
    });
  }

  private async checkVulnerabilities(
    route: { path: string; method: string },
    vulnerabilities: EndpointValidationResult['vulnerabilities']
  ): Promise<void> {
    const vulnScanner = new EndpointVulnerabilityScanner();
    
    // Check for common security anti-patterns
    vulnScanner.checkCommonVulnerabilities(route, vulnerabilities);
    
    // Check for injection vulnerabilities
    await vulnScanner.checkInjectionVulnerabilities(route, vulnerabilities);
    
    // Check authentication and authorization
    vulnScanner.checkAuthVulnerabilities(route, this.checkAuthenticationRequired(route), vulnerabilities);
    // Check for common vulnerabilities
    if (route.method === 'GET' && route.path.includes('/api/')) {
      if (!route.path.includes('limit=')) {
        vulnerabilities.push({
          id: 'MISSING_PAGINATION',
          severity: 'medium',
          description: 'API endpoint missing pagination parameters',
          remediation: 'Add limit and offset parameters to prevent data dumping'
        });
      }
    }

    if (route.method === 'POST' || route.method === 'PUT') {
      vulnerabilities.push({
        id: 'INPUT_VALIDATION',
        severity: 'high',
        description: 'Endpoint requires input validation check',
        remediation: 'Implement request body validation using a schema validator'
      });
    }

    // Check for sensitive information in URLs
    if (route.path.match(/\/(token|password|secret|key)/i)) {
      vulnerabilities.push({
        id: 'SENSITIVE_URL',
        severity: 'high',
        description: 'URL contains sensitive information',
        remediation: 'Remove sensitive information from URL path'
      });
    }
  }
} 