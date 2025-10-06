#!/bin/bash
set -euo pipefail

echo "[entrypoint] Starting Canvas App Backend"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint][warn] DATABASE_URL not set. Prisma will fail to connect if DB access is required." >&2
fi

# Run migrations (safe, idempotent)
if command -v npx >/dev/null 2>&1; then
  echo "[entrypoint] Running prisma migrate deploy"
  npx prisma migrate deploy || echo "[entrypoint][warn] prisma migrate deploy failed (continuing)"
  echo "[entrypoint] Generating prisma client"
  npx prisma generate || true
fi

# Start the server
echo "[entrypoint] Launching server on port ${PORT:-5000}"
exec node dist/server.js
