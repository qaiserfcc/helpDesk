import http from 'http';
import app from './app.js';
import { env } from './config/env.js';

const port = Number(env.PORT);

const server = http.createServer(app);

server.listen(port, () => {
  const baseUrl = `http://localhost:${port}`;
  console.log(`🚀 API listening on ${baseUrl}`);
  console.log(`📘 Swagger docs available at ${baseUrl}/docs`);
});
