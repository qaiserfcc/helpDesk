import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { initRealtimeServer } from "./realtime/socketServer.js";

const port = Number(env.PORT);

const server = http.createServer(app);

initRealtimeServer(server);

server.listen(port, () => {
  const baseUrl = `http://localhost:${port}`;
  console.error(`🚀 API listening on ${baseUrl}`);
  console.error(`📘 Swagger docs available at ${baseUrl}/docs`);
});
