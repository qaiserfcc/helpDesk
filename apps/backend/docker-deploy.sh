#!/usr/bin/env bash
# Build and deploy to Fly using the Dockerfile
set -euo pipefail

cd "$(dirname "$0")/.."

# Build locally to validate
npm ci
npm run fly:build

echo "Built successfully"

echo "Next steps: set FLY_API_TOKEN and run `flyctl deploy` from apps/backend."
