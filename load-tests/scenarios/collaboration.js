import http from 'k6/http';
import { check, sleep } from 'k6';
import { WebSocket } from 'k6/ws';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function() {
  return JSON.parse(open('./data/users.json'));
});

export function collaborativeEditing() {
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

  // Connect to WebSocket
  const url = `${__ENV.WS_URL}/collaboration?token=${token}`;
  const ws = new WebSocket(url);

  ws.on('open', function() {
    // Join document session
    ws.send(JSON.stringify({
      type: 'join',
      documentId: 'test-doc-123'
    }));

    // Simulate collaborative editing
    for (let i = 0; i < 5; i++) {
      ws.send(JSON.stringify({
        type: 'change',
        documentId: 'test-doc-123',
        change: {
          position: i * 10,
          insert: 'Hello ',
          delete: 0
        }
      }));
      sleep(0.5);
    }
  });

  ws.on('message', function(data) {
    check(data, {
      'message received': (d) => d !== undefined
    });
  });

  sleep(5);
  ws.close();
}