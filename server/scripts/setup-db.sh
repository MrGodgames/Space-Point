#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-space_point}"

createdb "$DB_NAME" 2>/dev/null || true
psql -d "$DB_NAME" -f "$(dirname "$0")/../db/schema.sql"

echo "Database ready: $DB_NAME"
