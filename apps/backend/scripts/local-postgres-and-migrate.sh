#!/usr/bin/env bash
set -euo pipefail

# Local helper to run a temporary postgres container and apply Prisma migrations.
# This script requires Docker installed and accessible.
# Usage: ./scripts/local-postgres-and-migrate.sh [POSTGRES_PASSWORD] [POSTGRES_PORT]

POSTGRES_PASSWORD="${1:-postgres}"
POSTGRES_PORT="${2:-5432}"
DB_NAME="helpdesk"
SHADOW_DB_NAME="helpdesk_shadow"

echo "Starting local postgres container on port $POSTGRES_PORT"
docker run --name helpdesk-db -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" -p $POSTGRES_PORT:5432 -d postgres:15

export DATABASE_URL="postgresql://postgres:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$DB_NAME"
export SHADOW_DATABASE_URL="postgresql://postgres:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$SHADOW_DB_NAME"
echo "Waiting for Postgres to accept connections..."
until docker exec helpdesk-db pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

docker exec helpdesk-db psql -U postgres -c "CREATE DATABASE IF NOT EXISTS $DB_NAME"
docker exec helpdesk-db psql -U postgres -c "CREATE DATABASE IF NOT EXISTS $SHADOW_DB_NAME"

echo "Running prisma generate and migrations"
export PGSSLMODE=disable
npx prisma generate
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Migrations applied. Stop the container manually if you want to";
echo "To stop and remove the container: docker rm -f helpdesk-db"
