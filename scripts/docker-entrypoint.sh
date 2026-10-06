#!/bin/sh
# Docker entrypoint: seed database if empty, then start Next.js server

set -e

# Default data directory (can be overridden by DATA_DIR env var)
DATA_DIR="${DATA_DIR:-/app/data}"
DB_PATH="${DATA_DIR}/news.db"
SEED_TEMPLATE="/app/seed-template.db"

# Create data directory if it doesn't exist
mkdir -p "${DATA_DIR}"

# Seed database if it doesn't exist
if [ ! -f "${DB_PATH}" ]; then
  echo "[entrypoint] Database not found, seeding from template..."
  cp "${SEED_TEMPLATE}" "${DB_PATH}"
  echo "[entrypoint] Database seeded successfully."
else
  echo "[entrypoint] Database already exists, skipping seed."
fi

# Start Next.js server
echo "[entrypoint] Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
