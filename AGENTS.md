# HelpDesk Agent Guide

This document is a runbook and specification for an agent (human or automated) working on the HelpDesk project.
It contains project-specific responsibilities, deployment & migration procedures, CI checks, and debugging guidance focused on real-time socket behavior, database migrations, auth, and parity between mobile and web clients.

---

## Table of contents
- Purpose & agent roles
- Key project architecture & integration points
- Local development & test flow
- CI: socket/web checks and workflows
- Production deployment & DB migration best practices
- Troubleshooting: Socket.io / real-time issues
- Useful commands & scripts
- Post-deploy validations and monitoring
- Follow-up tasks & recommended improvements

---

## Purpose & Agent Roles
This `agent` document defines the tasks and responsibilities an engineer or automation should perform to guarantee the HelpDesk project's stability, feature parity across mobile and web clients, and smooth real-time behavior.

Primary responsibilities:
- Ensure backend runs reliably on Fly and that Prisma migrations & seeds are applied correctly.
- Verify that mobile & web clients connect using JWT tokens and that Socket.IO events like `tickets:created`, `tickets:updated`, and `tickets:activity` are delivered.
- Confirm web parity: that every mobile screen is represented in the web app and that the UI updates when events occur.
- Implement and maintain CI checks for websocket connectivity and add E2E tests where appropriate.
- Manage secrets and DB configuration (including shadow DBs) to avoid Prisma migration warnings.

---

## Key Architecture & Integration Points
- Backend: Node 20 + TypeScript, Prisma v7, Express, Socket.IO
- DB: PostgreSQL (Neon / Fly DB), Prisma schema & migrations in `apps/backend/prisma`.
- Client(s): Mobile app (React Native / Expo) and Web App (React + Vite). Both use the same backend API and share realtime event names.
- Realtime Events: `tickets:created`, `tickets:updated`, `tickets:activity`
- Auth: JWT tokens issued from `/auth/login` and `/auth/register` are used for HTTP requests and as an auth token for Socket.IO handshakes (via `auth.token` or `Authorization` header).

---

## Local Development & Test Flow
Follow these steps to reproduce and validate features locally and in CI.

1) Backend & DB local run
   - Setup `.env` in `apps/backend` (DATABASE_URL, JWT secrets).
   - Run migrations & generate: `npx prisma migrate dev --schema=./prisma/schema.prisma && npx prisma generate` or using npm scripts in `apps/backend`.
   - Start backend in dev: `cd apps/backend && npm run dev`.

2) Web app
   - Start web dev server: `cd apps/web && VITE_API_BASE_URL=http://localhost:4000 npm run dev`.
   - Use the web pages: Login / Register, Tickets List, Ticket Detail, Create Ticket.

3) Mobile app
   - Use Expo to start the mobile app: `cd apps/mobile && npm start`.
   - Validate login and real-time UI updates from the mobile client.

4) Socket test scripts
   - Local socket test (client script): `node tools/socket-test.js` is useful for quick token & socket connect checks.
   - Backend CI socket test (build & execute): `npm run ci:test:socket` inside `apps/backend`. This script will either login (if credentials provided) or register a temporary test user and connect via websocket to assert that `tickets:created` events are delivered.

---

## CI: WebSocket & Event Delivery Checks
The repo includes a workflow that runs a simple socket test at `apps/backend/.github/workflows/ci-socket-check.yml`. The job performs the following:
- Installs dependencies (backend), builds the TypeScript code, and runs the CI socket test script `ci:test:socket`.
- The script will try login with provided secrets (`SOCKET_TEST_EMAIL`, `SOCKET_TEST_PASSWORD`) or register a temporary user and verify that a websocket opens and that `tickets:created` arrives after creating a ticket via REST.

Set the GitHub repo secrets in your repo settings:
- `API_BASE_URL` — the backend URL (e.g. `https://helpdesk-backend.fly.dev`)
- `SOCKET_TEST_EMAIL` & `SOCKET_TEST_PASSWORD` — optional; if not provided, the test registers a temporary user.

CI checks ensure websocket handshake, authentication, ticket create, and event delivery are working as expected.

---

## Production: Deploy, DB & Prisma
Deploy to Fly using `flyctl`. Use the `fly.toml` release_command to run migrations and fuzz a seed:

1) Fly secrets (set these for production):
   - `DATABASE_URL` — Neon DSN or Fly Postgres connection string. (Important: do not set `SHADOW_DATABASE_URL` equal to `DATABASE_URL`.)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — secrets used for access/refresh tokens.
   - `FCM_SERVICE_ACCOUNT` (optional), other integration keys.

2) Setup when you need a shadow DB for Prisma migrations:
- If you need a separate shadow DB, create a DB instance (Neon), then set `SHADOW_DATABASE_URL` to that DSN on the Fly app: `flyctl secrets set SHADOW_DATABASE_URL="<shadow-dsn>"`. 
- NEVER use the production `DATABASE_URL` value as shadow DB.

3) Deploy & migrations
   - Build image & push: `flyctl deploy --config ./apps/backend/fly.toml` (or use the helper script if available).
   - The `release_command` runs `npx prisma migrate deploy --schema=./prisma/schema.prisma && npm run seed:admin` and seeds the admin account.
   - Validate migrations via logs and `curl https://<fly-app-domain>/health`.

---

## Troubleshooting & Debugging Realtime Issues (Socket.IO)
When users report real-time issues, use this checklist for a systematic diagnosis:

1) Confirm the backend is reachable & healthy:
   - `curl https://helpdesk-backend.fly.dev/health` -> Should return 200.
   - Tail fly logs for evidence of the process: `flyctl logs --app helpdesk-backend`.

2) Validate token-based handshake:
   - Check token is provided: `auth.token` client handshake or `Authorization: Bearer <token>` header.
   - Check `apps/backend/src/realtime/socketServer.ts` logs: there are connection logs printing `socketId` and `origin` on connection.

3) Verify Socket.IO connection fallback & transport
   - For diagnosis, set `transports: ['websocket']` on the client to eliminate polling fallback.
   - If the client cannot establish a WebSocket, confirm load balancer and platform support and examine TLS & CORS issues.

4) Reproduce the issue exactly using these steps:
   - Run `node apps/mobile/tools/socket-test.js` or `npm run ci:test:socket`.
   - Simultaneously `flyctl logs --app helpdesk-backend` to watch the connection attempts.

5) If socket is connecting but not receiving events, inspect the following:
   - Event channel membership: confirm the socket joined `ticket:...`, `role:...`, `user:...` rooms.
   - Confirm the ticket event publisher calls `publishTicketEvent` with correct `ticket` or `ticketId` and audience.
   - Confirm the consumer has permissions (role/createdBy check performed in `ensureTicketAccess`) to watch events.

6) Socket debug logging & alerts
   - Add logging in `socketServer.ts` for handshake origin, token length, socket id, and connect/disconnect events.
   - Log `connect_error`, `disconnect` reasons, and real-time runtime errors, ideally using `logSocketFailure`.

7) Proxy/Load balancer issues
   - If websockets cannot upgrade to a persistent connection, confirm Fly config and network. If necessary, ask Fly support or use polling as a fallback and set a clear UI message.

---

## Useful Commands & Scripts
- Provision Fly DB & attach: `flyctl postgres create --name helpdesk-db --region iad` then `flyctl postgres attach --app helpdesk-backend --name helpdesk-db`.
- Deploy to Fly: `flyctl deploy --config apps/backend/fly.toml`.
- Set Fly secrets: `flyctl secrets set DATABASE_URL="postgresql://..." JWT_ACCESS_SECRET="..." JWT_REFRESH_SECRET="..."`.
- Unset shadow DB: `flyctl secrets unset SHADOW_DATABASE_URL` (if accidentally set to main DB).
- Inspect logs: `flyctl logs --app helpdesk-backend --json --no-tail`.
- Local socket test (mobile/test harness): `node tools/socket-test.js` (set `BASE_URL` or change default in the file).
- CI socket check: run locally `API_BASE_URL=https://helpdesk-backend.fly.dev EMAIL=admin@helpdesk.local PASSWORD=ChangeMe123! npm run ci:test:socket` from the `apps/backend` directory.

---

## Post-Deploy Validations & Health Checks
Every production deploy should have the following checks:
- Confirm the `health` endpoint returns 200
- `flyctl logs` show "No pending migrations to apply." and `✅ Admin user already exists:` seed messages
- Confirm client(s) can login, create a ticket, and receive `tickets:created` events
- Check all background and worker processes (if present) for errors

---

## Security & Role Guidance
- Avoid exposing secrets in logs.
- Ensure `SHADOW_DATABASE_URL` is never the same as `DATABASE_URL`.
- For production admin password, do not use default `ChangeMe123!`. Rely on secure secrets and rotate them regularly.
- Use RBAC roles in the UI for `admin`, `agent`, `user` to limit actions like assigning or resolving tickets.

---

## Follow-up Tasks / Recommendations
1) Implement an E2E test suite for the web app to ensure UI parity with mobile including real-time subscription checks (create ticket -> event arrives).
2) Automate the creation of a Neon shadow DB in CI and set `SHADOW_DATABASE_URL` for safe migrations.
3) Use Sentry or a logging aggregator to track socket connection errors plus user-visible inactivity events in production.
4) Schedule a maintenance runbook for schema modifications and database changes.
5) Add a nightly smoke test to validate websocket event delivery for the critical path.

---

## Contacts & Docs
- Backend README (Fly): `apps/backend/README.fly.md`
- Backend scripts & test: `apps/backend/src/scripts/ciSocketTest.ts` and `apps/backend/tools/*socket-test*.js`.
- Realtime docs: `apps/backend/docs/realtime.md`
- Mobile realtime integration: `apps/mobile/src/realtime/ticketSocket.ts`
- Web realtime integration: `apps/web/src/realtime/ticketSocket.ts`

If you need me to add or change any steps or create a PR to automate the Neon shadow DB setup or a nightly socket-check workflow, let me know which option you'd like me to implement next.
