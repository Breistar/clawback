#!/bin/sh
set -e

cd /app

# First boot (or empty volume): load the choreographed demo data
if [ ! -f server/db/clawback.db ]; then
  echo "→ No database found — running seed..."
  npm run seed
fi

echo "→ Starting Clawback on port ${API_PORT:-80}..."
exec npm start
