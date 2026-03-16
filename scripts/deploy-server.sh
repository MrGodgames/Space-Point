#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.deploy"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=1
      ;;
    --help|-h)
      echo "Usage: ./scripts/deploy-server.sh [--dry-run]"
      echo "  --dry-run  Print commands without executing them"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-}"
DEPLOY_INSTALL_COMMAND="${DEPLOY_INSTALL_COMMAND:-npm install}"
DEPLOY_STOP_COMMAND="${DEPLOY_STOP_COMMAND:-pkill -f '[n]ode src/index.js' || true}"
DEPLOY_START_COMMAND="${DEPLOY_START_COMMAND:-cd $DEPLOY_PATH/server && nohup npm run dev >> server.log 2>&1 < /dev/null &}"

require_var() {
  local name="$1"
  local value="$2"

  if [[ -z "$value" ]]; then
    echo "Missing required variable: $name"
    echo "Create $ENV_FILE from .env.deploy.example and fill in the values."
    exit 1
  fi
}

require_var "DEPLOY_HOST" "$DEPLOY_HOST"
require_var "DEPLOY_USER" "$DEPLOY_USER"
require_var "DEPLOY_PATH" "$DEPLOY_PATH"

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_ARGS=(-p "$DEPLOY_PORT")
REMOTE_SERVER_DIR="$(printf '%q' "$DEPLOY_PATH/server")"
LOCAL_SERVER_DIR="$ROOT_DIR/server/"
RSYNC_CMD=(
  rsync -az --progress
  -e "ssh -p $DEPLOY_PORT"
  --exclude node_modules
  --exclude .env
  --exclude .DS_Store
  "$LOCAL_SERVER_DIR"
  "${REMOTE}:${DEPLOY_PATH}/server/"
)
INSTALL_CMD=(ssh "${SSH_ARGS[@]}" "$REMOTE" "cd $REMOTE_SERVER_DIR && $DEPLOY_INSTALL_COMMAND")
STOP_CMD=(ssh "${SSH_ARGS[@]}" "$REMOTE" "$DEPLOY_STOP_COMMAND")
START_CMD=(ssh -f -n "${SSH_ARGS[@]}" "$REMOTE" "$DEPLOY_START_COMMAND")

echo "Deploy target: $REMOTE"
echo "Remote server path: $DEPLOY_PATH/server"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run mode enabled"
  printf 'Rsync: '
  printf '%q ' "${RSYNC_CMD[@]}"
  echo
  printf 'Install: '
  printf '%q ' "${INSTALL_CMD[@]}"
  echo
  printf 'Stop: '
  printf '%q ' "${STOP_CMD[@]}"
  echo
  printf 'Start: '
  printf '%q ' "${START_CMD[@]}"
  echo
  exit 0
fi

echo "1/3 Syncing server files"
"${RSYNC_CMD[@]}"

echo "2/3 Installing server dependencies"
"${INSTALL_CMD[@]}"

echo "3/3 Restarting server process"
"${STOP_CMD[@]}"
"${START_CMD[@]}"

echo "Deploy completed"
