import http from 'k6/http';
import { check, sleep } from 'k6';
import { WebSocket } from 'k6/ws';
import { SharedArray } from 'k6/data';

// Load test users from JSON file
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
    'received auth token': (r) => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');

  // Connect to WebSocket
  const ws = new WebSocket(`${__ENV.WS_URL}/collaboration`, null, {
    headers: { Authorization: `Bearer ${token}` }
  });

  check(ws, {
    'connected to websocket': () => ws.readyState === WebSocket.OPEN,
  });

  // Join or create session
  ws.send(JSON.stringify({
    type: 'join_session',
    sessionId: __ENV.SESSION_ID || 'new'
  }));

  // Simulate editing
  for (let i = 0; i < 10; i++) {
    ws.send(JSON.stringify({
      type: 'code_change',
      changes: [{
        from: { line: i, ch: 0 },
        to: { line: i, ch: 0 },
        text: `console.log("Edit ${i}");\n`
      }]
    }));
    sleep(1);
  }

  ws.close();
} 