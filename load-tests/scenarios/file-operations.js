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

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined
  });

  const token = loginRes.json('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Create document
  const createDocRes = http.post(
    `${__ENV.BASE_URL}/api/documents`,
    JSON.stringify({
      title: `Load Test Doc ${Date.now()}`,
      content: 'Initial content'
    }),
    { headers }
  );

  check(createDocRes, {
    'document created': (r) => r.status === 201,
    'has document id': (r) => r.json('id') !== undefined
  });

  const docId = createDocRes.json('id');

  // Update document
  const updateDocRes = http.put(
    `${__ENV.BASE_URL}/api/documents/${docId}`,
    JSON.stringify({
      content: 'Updated content'
    }),
    { headers }
  );

  check(updateDocRes, {
    'document updated': (r) => r.status === 200
  });

  sleep(1);

  // Get document
  const getDocRes = http.get(
    `${__ENV.BASE_URL}/api/documents/${docId}`,
    { headers }
  );

  check(getDocRes, {
    'document retrieved': (r) => r.status === 200,
    'content updated': (r) => r.json('content') === 'Updated content'
  });

  sleep(1);

  // Delete document
  const deleteDocRes = http.del(
    `${__ENV.BASE_URL}/api/documents/${docId}`,
    null,
    { headers }
  );

  check(deleteDocRes, {
    'document deleted': (r) => r.status === 204
  });
}