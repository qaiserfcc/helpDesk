#!/usr/bin/env bash
set -euo pipefail

# Helper to set Fly secrets and deploy the backend
# Expects FLY_APP and DATABASE_URL to be set in the environment.

if [ -z "${FLY_APP:-}" ]; then
  echo "Please set FLY_APP (example: helpdesk-backend)"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Please set DATABASE_URL (export DATABASE_URL before running this script)"
  exit 1
fi

# Optionally provide SHADOW_DATABASE_URL, FCM_SERVICE_ACCOUNT_BASE64, JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
export SHADOW_DATABASE_URL="${SHADOW_DATABASE_URL:-}"
export FCM_SERVICE_ACCOUNT_BASE64="${FCM_SERVICE_ACCOUNT_BASE64:-}"
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}"

echo "Setting Fly secrets for app: $FLY_APP"
flyctl secrets set DATABASE_URL="$DATABASE_URL" \
  JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET" \
  JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  FCM_SERVICE_ACCOUNT="$FCM_SERVICE_ACCOUNT_BASE64" \
  SHADOW_DATABASE_URL="$SHADOW_DATABASE_URL" \
  --app "$FLY_APP"

echo "Secrets set, deploying to Fly..."
flyctl deploy --config ./fly.toml --app "$FLY_APP"

echo "Deployment complete. Check logs with: flyctl logs --app $FLY_APP"
