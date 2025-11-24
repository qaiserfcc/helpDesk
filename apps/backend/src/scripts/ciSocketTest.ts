import axios from 'axios';
import { io } from 'socket.io-client';
import { config } from 'dotenv';

config();

async function main() {
  const baseUrl = process.env.API_BASE_URL || 'https://helpdesk-backend.fly.dev';
  const email = process.env.EMAIL || process.env.ADMIN_EMAIL || 'admin@helpdesk.local';
  const password = process.env.PASSWORD || process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  console.log('CI socket check: login', email, baseUrl + '/auth/login');
  let token: string | undefined;
  try {
    const res = await axios.post(`${baseUrl}/auth/login`, { email, password }, { timeout: 10000 });
    token = res.data?.tokens?.accessToken;
  } catch (err: any) {
    const status = err?.response?.status;
    console.log('Login failed', { status, message: err?.message });
    if (status === 401 || status === 400) {
      console.log('Attempting to register a temporary user for socket test');
      const tempEmail = (process.env.TEST_EMAIL) || `test+ci-${Math.random().toString(36).slice(2)}@helpdesk.local`;
      const tempPassword = (process.env.TEST_PASSWORD) || `P@ss${Math.random().toString(36).slice(2)}!`;
      try {
        const reg = await axios.post(`${baseUrl}/auth/register`, { name: 'CI Test', email: tempEmail, password: tempPassword }, { timeout: 10000 });
        token = reg.data?.tokens?.accessToken;
        if (!token) {
          console.error('Register succeeded but tokens not returned', reg.data);
          process.exit(5);
        }
        console.log('Registered temporary user', tempEmail);
      } catch (regErr: any) {
        console.error('Register failed', regErr?.response?.data || regErr?.message || regErr);
        process.exit(4);
      }
    }
  }
  if (!token) {
    console.error('Failed to get access token from login/register response');
    process.exit(3);
  }
  console.log('Got token length', token.length);

  const socket = io(baseUrl, {
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    timeout: 10000,
    reconnectionAttempts: 1,
    path: '/socket.io',
  });

  let timeout: NodeJS.Timeout;
  function fail(msg: string, code = 2) {
    console.error(msg);
    clearTimeout(timeout);
    socket.disconnect();
    process.exit(code);
  }

  // Listen for ticket created events
  let expectedTicketId: string | undefined;
  socket.on('tickets:created', (payload: any) => {
    try {
      console.log('tickets:created received', JSON.stringify(payload));
      const id = payload?.ticket?.id || payload?.id || payload?.ticketId;
      if (!id) {
        console.warn('tickets:created payload missing id');
        return;
      }
      if (expectedTicketId && id !== expectedTicketId) {
        console.warn('tickets:created for unrelated ticket ignored', { expectedTicketId, received: id });
        return;
      }
      console.log('tickets:created matched ticket id', id);
      clearTimeout(timeout);
      socket.disconnect();
      process.exit(0);
    } catch (err) {
      fail('Error handling tickets:created: ' + String(err));
    }
  });

  socket.on('connect', async () => {
    console.log('Socket connected', socket.id);
    // Create a ticket using the same token so that we receive the tickets:created event
    try {
      const now = Date.now();
      const description = `CI test ticket ${now}`;
      const createResp = await axios.post(`${baseUrl}/tickets`, { description }, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      const ticket = createResp?.data?.ticket;
      if (!ticket || !ticket.id) {
        fail('Ticket creation response did not contain ticket id', 6);
        return;
      }
      expectedTicketId = ticket.id;
      console.log('Created ticket', expectedTicketId);
    } catch (err: any) {
      console.error('Failed to create ticket', err?.response?.data || err?.message || err);
      fail('Ticket create failed', 7);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected', reason);
  });

  socket.on('connect_error', (err) => {
    fail(`connect_error ${err && err.message ? err.message : String(err)}`);
  });

  socket.on('error', (err) => {
    fail(`socket error ${err}`);
  });

  timeout = setTimeout(() => {
    fail('timed out waiting for socket connect', 4);
  }, 20000);
}

main().catch((err) => {
  console.error('CI socket check failed', err && err.message ? err.message : err);
  process.exit(1);
});

