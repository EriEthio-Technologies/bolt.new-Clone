export interface SecurityHeader {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
}

export const REQUIRED_SECURITY_HEADERS: SecurityHeader[] = [
  { 
    name: 'Content-Security-Policy',
    required: true,
  },
  {
    name: 'X-Content-Type-Options',
    required: true,
    validator: (value) => value === 'nosniff'
  },
  {
    name: 'X-Frame-Options',
    required: true,
    validator: (value) => ['DENY', 'SAMEORIGIN'].includes(value)
  },
  {
    name: 'Strict-Transport-Security',
    required: true,
    validator: (value) => value.includes('max-age=') && parseInt(value.split('max-age=')[1]) >= 31536000
  },
  {
    name: 'X-XSS-Protection',
    required: true,
    validator: (value) => value === '1; mode=block'
  },
  {
    name: 'Referrer-Policy',
    required: true,
    validator: (value) => ['strict-origin', 'strict-origin-when-cross-origin'].includes(value)
  }
];