#!/usr/bin/env bash
set -euo pipefail
# Create a managed Fly Postgres DB, attach it to the Fly app, set secrets and deploy

usage() {
  cat <<EOF
Usage: $0 [--app <fly-app-name>] [--db-name <db-name>] [--region <region>] [--no-deploy] [--non-interactive]

This script automates:
  - creating a Fly managed Postgres (flyctl postgres create)
  - attaching it to your Fly app (flyctl postgres attach)
  - setting common secrets (DATABASE_URL, SHADOW_DATABASE_URL optionally, JWT secrets, FCM base64)
  - optionally running `flyctl deploy` after attach.

Environment variables accepted (fallback to interactive prompt if not set):
  FLY_APP                 fly application name to attach DB to (or the script will parse fly.toml)
  FLY_API_TOKEN           Fly API token (if not present, user must be logged in via flyctl auth)
  DATABASE_PASSWORD       Postgres user password (defaults to a random one)
  DATABASE_NAME           Database name (default: helpdesk)
  SHADOW_DATABASE_NAME    Shadow DB name (default: helpdesk_shadow)
  REGION                  Fly region (default: iad)
  NO_DEPLOY               if set, script will not run `flyctl deploy` after attach
  NON_INTERACTIVE         if set, script will not prompt and will use defaults / provided flags

Examples:
  FLY_API_TOKEN=... $0 --app helpdesk-backend
  $0 --db-name helpdesk-db --region iad --app helpdesk-backend

EOF
  exit 1
}

ensure_flyctl() {
  if ! command -v flyctl >/dev/null 2>&1; then
    echo "flyctl is required but not found. Install from https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
  fi
}

parse_fly_toml_app() {
  if [[ -f fly.toml ]]; then
    local app=$(grep -E "^app\s*=\s*'" fly.toml | sed -E "s/^app\s*=\s*'([a-zA-Z0-9\-_]*)'.*/\1/" || true)
    echo "$app"
  fi
}

random_secret() {
  # default fallback method using openssl if available
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    date +%s | sha256sum | head -c 64
  fi
}

ask() {
  local prompt="$1"
  local default="$2"
  local non_interactive="$3"
  if [[ "$non_interactive" == "true" ]]; then
    echo "${default}"
    return
  fi
  read -p "$prompt [$default]: " answer
  if [[ -z "$answer" ]]; then
    echo "$default"
  else
    echo "$answer"
  fi
}

app=""
db_name=""
region="iad"
no_deploy=false
non_interactive=false
db_user="postgres"
db_password=""
database_name="helpdesk"
shadow_name="helpdesk_shadow"

dry_run=false
attach_only=false
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --app) app="$2"; shift 2;;
    --db-name) db_name="$2"; shift 2;;
    --region) region="$2"; shift 2;;
    --no-deploy) no_deploy=true; shift 1;;
    --non-interactive) non_interactive=true; shift 1;;
    --help) usage;;
    --dry-run) dry_run=true; shift 1;;
    --attach-only) attach_only=true; shift 1;;
    -*) echo "Unknown option: $1"; usage;;
    *) break;;
  esac
done

ensure_flyctl

if [[ -z "$app" ]]; then
  # try reading from fly.toml
  app=$(parse_fly_toml_app)
fi

if [[ -z "$app" ]]; then
  app=$(ask "Fly app name (FLY_APP)" "helpdesk-backend" "$non_interactive")
fi

if [[ -z "${FLY_API_TOKEN:-}" && "$dry_run" == "false" ]]; then
  echo "FLY_API_TOKEN is not set. Please login via 'flyctl auth login' or export FLY_API_TOKEN in env."
  if [[ "$non_interactive" == "true" ]]; then
    echo "Non-interactive mode and missing FLY_API_TOKEN. Exiting.";
    exit 2
  fi
  read -p "Press ENTER to continue after running 'flyctl auth login' (or set FLY_API_TOKEN): " _unused
fi

if [[ -z "$db_name" ]]; then
  db_name=$(ask "Name for the Fly Postgres service" "helpdesk-db" "$non_interactive")
fi

region=$(ask "Fly region" "$region" "$non_interactive")

if [[ -z "${DATABASE_PASSWORD:-}" ]]; then
  if [[ "$non_interactive" == "true" ]]; then
    db_password=$(random_secret)
  else
    db_password=$(ask "Database password (will be created for 'postgres' user)" "$(random_secret)" "$non_interactive")
  fi
fi

if [[ "$attach_only" == "true" ]]; then
  echo "Attach-only: skipping creation of DB '$db_name'"
else
  echo "Creating Fly Postgres instance '$db_name' in region '$region'..."
  if [[ "$dry_run" == "true" ]]; then
    echo ">> DRY RUN: flyctl postgres create --name \"$db_name\" --region \"$region\" --vm-size shared-cpu-1x --initial-cluster-size 1 --volume-size 10 --yes"
else
  set -x
  # Use single instance and 10GB volume by default to avoid HA prompt and large volume size
  flyctl postgres create --name "$db_name" --region "$region" --vm-size shared-cpu-1x --initial-cluster-size 1 --volume-size 10 --yes || true
  set +x
fi
fi
if [[ "$dry_run" == "false" ]]; then
  echo "Waiting for DB to be ready (this may take a minute)..."
  for i in {1..60}; do
    if flyctl postgres list | grep -q "$db_name"; then
      echo "DB appears in list. Continuing..."; break
    fi
    sleep 3
  done
else
  echo "Skipping DB wait due to --dry-run"
fi

echo "Attaching to app '$app'..."
  if [[ "$dry_run" == "true" ]]; then
  echo ">> DRY RUN: flyctl postgres attach \"$db_name\" --app \"$app\" --yes"
else
  set -x
  # attach takes the POSTGRES app as the first arg, then the consumer app via --app
  flyctl postgres attach "$db_name" --app "$app" --yes || true
  set +x
fi

if [[ "$dry_run" == "true" ]]; then
  echo "Skipping fetching secret database connection string due to --dry-run"
else
  echo "Fetching database connection string from secrets..."
fi
DATABASE_URL=""
for i in {1..30}; do
  # try reading secrets JSON from flyctl; the output may not be JSON depending on version
  if [[ "$dry_run" == "true" ]]; then
    break
  fi
  DATABASE_URL=$(flyctl secrets list --app "$app" --format json 2>/dev/null | jq -r '.[] | select(.name=="DATABASE_URL") | .value' 2>/dev/null || true)
  # fallback to parse plain text
  if [[ -z "$DATABASE_URL" ]]; then
    DATABASE_URL=$(flyctl secrets list --app "$app" 2>/dev/null | grep DATABASE_URL | awk '{print $2}' || true)
  fi
  if [[ -n "$DATABASE_URL" ]]; then
    break
  fi
  sleep 2
done

if [[ -z "$DATABASE_URL" ]]; then
  echo "Unable to fetch DATABASE_URL from Fly secrets. If attach worked, you can add it manually via 'flyctl secrets set DATABASE_URL=...'"
else
  echo "DATABASE_URL fetched from secrets."
fi

echo "Setting additional secrets (JWT secrets, optional FCM)."
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$(random_secret)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(random_secret)}"
FCM_SERVICE_ACCOUNT_BASE64="${FCM_SERVICE_ACCOUNT_BASE64:-}" 

echo "Applying secrets to Fly app '$app'..."
if [[ "$dry_run" == "true" ]]; then
  if [[ -n "$DATABASE_URL" ]]; then
    echo ">> DRY RUN: flyctl secrets set DATABASE_URL=\"$DATABASE_URL\" --app \"$app\""
  fi
  echo ">> DRY RUN: flyctl secrets set JWT_ACCESS_SECRET=\"$JWT_ACCESS_SECRET\" JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\" --app \"$app\""
  if [[ -n "$FCM_SERVICE_ACCOUNT_BASE64" ]]; then
    echo ">> DRY RUN: flyctl secrets set FCM_SERVICE_ACCOUNT=\"$FCM_SERVICE_ACCOUNT_BASE64\" --app \"$app\""
  fi
else
  set -x
  if [[ -n "$DATABASE_URL" ]]; then
    flyctl secrets set DATABASE_URL="$DATABASE_URL" --app "$app" || true
  fi
  flyctl secrets set JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET" JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" --app "$app" || true
  if [[ -n "$FCM_SERVICE_ACCOUNT_BASE64" ]]; then
    flyctl secrets set FCM_SERVICE_ACCOUNT="$FCM_SERVICE_ACCOUNT_BASE64" --app "$app" || true
  fi
  set +x
fi

if [[ "$no_deploy" == "false" && "$attach_only" == "false" ]]; then
  echo "Deploying app to Fly..."
  if [[ "$dry_run" == "true" ]]; then
    echo ">> DRY RUN: flyctl deploy --config ./fly.toml --app \"$app\""
  else
  flyctl deploy --config ./fly.toml --app "$app"
  echo "Deployment started. You can view logs with: flyctl logs --app $app"
  fi
else
  echo "Skipping deployment because --no-deploy passed. You can run 'flyctl deploy --config ./fly.toml --app $app' manually."
fi

echo "Done. If you need to verify secrets, run: flyctl secrets list --app $app"
