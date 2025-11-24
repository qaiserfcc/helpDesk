Fly.io deployment guide
=======================

This file complements `README.fly.md` and describes important steps for the production deployment.

1. Create your Fly app
```
flyctl launch --name helpdesk-backend --region iad --no-deploy
```

2. Set your secrets (replace placeholders)
```
export DATABASE_URL="postgresql://..."
export FLY_APP="helpdesk-backend"
export JWT_ACCESS_SECRET="your-jwt-secret"
export JWT_REFRESH_SECRET="your-jwt-secret"
export FCM_SERVICE_ACCOUNT_BASE64="$(base64 -w 0 ./path/to/serviceAccount.json)"
flyctl auth login
./scripts/set_fly_secrets.sh
```

3. Deploy
```
flyctl deploy --config ./fly.toml
```

4. Run migrations and seed (run automatically via `release_command` in fly.toml):
```
# If not running in release_command
flyctl ssh console -C 'cd /app && npx prisma migrate deploy && npm run seed:admin'
```

5. Post-deploy: Update mobile env
```
# NOTE: Replace host with Fly public hostname
EXPO_PUBLIC_API_URL=https://helpdesk-backend.fly.dev
EXPO_PUBLIC_ENV=production
```

6. On CI: Add `FLY_API_TOKEN` to Actions secrets
```
# Use `flyctl auth token` to get a token and set as GitHub secret
```

7. Debugging & logs
Shadow database notes
---------------------
Prisma may attempt to create a "shadow" database to compute schema migrations (used in `migrate dev`).
If your managed Postgres does not allow the current user to create new databases, create a shadow DB and expose a separate connection string for Prisma to use.

Example Postgres SQL (run as an admin user):

```sql
CREATE DATABASE helpdesk_shadow;
GRANT ALL PRIVILEGES ON DATABASE helpdesk_shadow TO your_db_user;
```

Set the `SHADOW_DATABASE_URL` secret to the new DB's connection string and add to Fly using the `set_fly_secrets.sh` helper.

In many production workflows the command `npx prisma migrate deploy` does not require a shadow DB, but `prisma migrate dev` does. Use `migrate deploy` in CI or release commands for production deployments.

```
flyctl logs --app $FLY_APP
flyctl status --app $FLY_APP
```

