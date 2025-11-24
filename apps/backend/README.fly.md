# Deploying helpdesk-backend to Fly.io

This document explains how to deploy your backend to Fly.io and configure Prisma migrations and environment variables.

Prereqs
- flyctl installed (https://fly.io/docs/hands-on/install-flyctl/)
- Fly account (https://fly.io)

Steps

1) Initialize a Fly app (run from `apps/backend`):

```bash
cd apps/backend
# runs a guided setup. When asked for the builder, choose Dockerfile.
flyctl launch --name helpdesk-backend --region iad --no-deploy
```

2) Add secrets to Fly (replace values):

```bash
flyctl secrets set \
  DATABASE_URL="postgresql://username:password@host:5432/dbname" \
  JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET}" \
  JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
  FCM_SERVICE_ACCOUNT="${FCM_SERVICE_ACCOUNT_CONTENT_WHEN_BASE64}" \
  # add any other env vars you need here
```

If you don't already have a Postgres instance, Fly provides a managed Postgres product. To create a new Postgres instance on Fly and attach it to your app, run:

```bash
# Create a managed Postgres (non-destructive - will prompt for confirmation)
flyctl postgres create --name helpdesk-db --region iad

# After creation, attach the DB to your app to ensure secrets are set
flyctl postgres attach --app helpdesk-backend --name helpdesk-db

# You can also inspect the connection string with:
flyctl postgres list
# Or get credentials for manual secret setting with:
flyctl secrets list --app helpdesk-backend
```

Note: If you store a file like `serviceAccount.json`, consider storing the JSON as a base64 encoded secret and decode it at runtime.

3) Deploy (this will run the `release_command` in `fly.toml` which runs `npx prisma migrate deploy` and `npm run seed:admin`):

```bash
# Optionally use the automated helper script which creates and attaches DB, sets secrets and deploys
```bash
# dry run (will only print commands, safe to run without `flyctl` credentials)
./scripts/create-fly-db-and-deploy.sh --app helpdesk-backend --dry-run

# interactive run (will prompt for confirmation and values)
./scripts/create-fly-db-and-deploy.sh --app helpdesk-backend

# non-interactively create database, attach, set secrets and deploy
FLY_API_TOKEN="${FLY_API_TOKEN}" ./scripts/create-fly-db-and-deploy.sh --app helpdesk-backend --db-name helpdesk-db --region iad
```

# or deploy directly
```bash
flyctl deploy --config ./fly.toml
```
```

4) Access your app:
- View logs: `flyctl logs --app helpdesk-backend`
- Get the public url: `flyctl info -a helpdesk-backend` (or `flyctl status`)

5) Update mobile config to point to this domain
- Add Expo env change in `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://<YOUR_FLY_APP_HOST>
EXPO_PUBLIC_ENV=production
```

6) CI (GitHub Actions):
- See `.github/workflows/deploy-fly.yml` which triggers on push to `main`/`master` and deploys to Fly. Ensure the `FLY_API_TOKEN` secret is stored in GitHub secrets.

7) CI: WebSocket connectivity test
- A GitHub Actions workflow `.github/workflows/ci-socket-check.yml` is available to run a small socket test that registers a temporary user, obtains a token and validates the socket.io websocket connects successfully.
- The job requires the following GitHub secrets to be set for the check to succeed:
  - `API_BASE_URL` (e.g. `https://helpdesk-backend.fly.dev`)
  - `SOCKET_TEST_EMAIL` (optional; if missing the workflow will register a temporary user)
  - `SOCKET_TEST_PASSWORD` (optional)

8) Shadow DB for Prisma
- Prisma requires a separate shadow database for safe `prisma migrate dev` usage and for `migrate deploy` in some workflows. Do NOT set `SHADOW_DATABASE_URL` to point at your main `DATABASE_URL` — Prisma will reject it.
- To create a shadow DB in Neon or another provider, either create a new DB instance or a database role that maps to a different database/schema and add it to Fly as a secret:

```bash
# After creating a shadow DB (e.g. via Neon Console), set the Fly secret:
flyctl secrets set SHADOW_DATABASE_URL="postgresql://user:pass@host:5432/helpdesk_shadow?sslmode=require"

# Confirm the secret is set:
flyctl secrets list --app helpdesk-backend
```

Alternatively, use the helper script `scripts/set_fly_shadow_secret.sh` and supply a DSN.

Notes
- Database migrations are applied during release — ensure your `DATABASE_URL` is set in Fly secrets and that the DB is reachable.
- Prisma `migrate dev` is for development only; we use `migrate deploy` for production.
- Logs are persisted via Fly; you can view them with `flyctl logs`.
- If you plan to keep `vercel` for frontend or other microservices, ensure cross-origin policies are compatible and that the mobile app's host points to the Fly domain.
