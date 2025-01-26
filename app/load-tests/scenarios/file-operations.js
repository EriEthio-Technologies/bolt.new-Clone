import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function() {
  return JSON.parse(open('./data/users.json'));
});

export function fileOperations() {
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

  // Create file
  const createRes = http.post(`${__ENV.BASE_URL}/api/files`, {
    name: `test_${Date.now()}.ts`,
    content: 'console.log("Hello");'
  }, { headers });

  check(createRes, {
    'file created': (r) => r.status === 201,
  });

  const fileId = createRes.json('id');

  // Read file
  const readRes = http.get(`${__ENV.BASE_URL}/api/files/${fileId}`, { headers });
  
  check(readRes, {
    'file read': (r) => r.status === 200,
    'content correct': (r) => r.json('content').includes('Hello'),
  });

  // Update file
  const updateRes = http.put(`${__ENV.BASE_URL}/api/files/${fileId}`, {
    content: 'console.log("Updated");'
  }, { headers });

  check(updateRes, {
    'file updated': (r) => r.status === 200,
  });

  sleep(1);

  // Delete file
  const deleteRes = http.del(`${__ENV.BASE_URL}/api/files/${fileId}`, null, { headers });

  check(deleteRes, {
    'file deleted': (r) => r.status === 204,
  });
} 