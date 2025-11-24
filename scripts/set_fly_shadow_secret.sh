#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <SHADOW_DATABASE_URL>"
  echo "Example: $0 'postgresql://user:pass@host:5432/helpdesk_shadow?sslmode=require'"
  exit 2
fi

SHADOW_DSN="$1"

echo "Setting Fly secret SHADOW_DATABASE_URL..."
flyctl secrets set SHADOW_DATABASE_URL="$SHADOW_DSN"

echo "Tip: Do not set the SHADOW_DATABASE_URL to match the main DATABASE_URL."
