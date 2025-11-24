#!/usr/bin/env bash
set -euo pipefail

# Example usage:
# FLY_APP=helpdesk-backend
# flyctl secrets set DATABASE_URL="postgresql://..." JWT_ACCESS_SECRET="..." JWT_REFRESH_SECRET="..."

if [ -z "${FLY_APP:-}" ]; then
  echo "Please set FLY_APP (example: helpdesk-backend)"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Please set DATABASE_URL (export DATABASE_URL before running this script)"
  exit 1
fi

flyctl secrets set DATABASE_URL="$DATABASE_URL" \
  JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}" \
  JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}" \
  FCM_SERVICE_ACCOUNT="${FCM_SERVICE_ACCOUNT_BASE64:-}" \
  SHADOW_DATABASE_URL="${SHADOW_DATABASE_URL:-}" \
  --app "$FLY_APP"

echo "Secrets updated for $FLY_APP"