const axios = require('axios');
const { io } = require('socket.io-client');

const baseUrl = process.env.BASE_URL || 'https://help-desk-apis.vercel.app';
const email = process.env.EMAIL || 'user3@helpdesk.local';
const password = process.env.PASSWORD || 'Password1!';

(async function main() {
  try {
    console.log('Logging in', email, baseUrl + '/auth/login');
    const res = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = res.data.tokens.accessToken;
    console.log('Got token length', token.length);

    const socket = io(baseUrl, {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      reconnectionAttempts: 0,
      timeout: 5000,
      path: '/socket.io',
    });

    socket.on('connect', () => {
      console.log('Socket connected', socket.id);
      socket.disconnect();
      process.exit(0);
    });

    socket.on('connect_error', (err) => {
      console.error('connect_error:', err && err.message ? err.message : String(err));
      process.exit(1);
    });

    socket.on('error', (err) => {
      console.error('socket error:', err);
      process.exit(1);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected', reason);
    });
  } catch (err) {
    console.error('Login or socket test failed', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
