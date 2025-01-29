import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function() {
  return JSON.parse(open('./data/users.json'));
});

export function apiOperations() {
  const user = users[Math.floor(Math.random() * users.length)];
  
  // Login
  const loginRes = http.post(`${__ENV.BASE_URL}/api/auth/login`, {
    email: user.email,
    password: user.password
  });

  const token = loginRes.json('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test API endpoints
  const endpoints = [
    { method: 'GET', path: '/api/projects' },
    { method: 'GET', path: '/api/documents' },
    { method: 'GET', path: '/api/users/profile' }
  ];

  endpoints.forEach(endpoint => {
    const response = http.request(endpoint.method, `${__ENV.BASE_URL}${endpoint.path}`, null, { headers });
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200
    });

    sleep(1);
  });
}