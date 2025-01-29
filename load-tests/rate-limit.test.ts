import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    unauthenticated_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
    authenticated_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      env: { API_KEY: '${API_KEY}' },
    },
  },
};

export default function() {
  const isAuthenticated = __ENV.API_KEY !== undefined;
  const headers = isAuthenticated 
    ? { 'x-api-key': __ENV.API_KEY }
    : {};

  const response = http.get('http://api.example.com/test', { headers });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'rate limit not exceeded': (r) => r.status !== 429,
  });

  sleep(1);
}