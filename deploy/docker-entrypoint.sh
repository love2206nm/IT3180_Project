#!/bin/sh
set -e

echo "================================================================="
echo "  DELIVERY HUB MANAGEMENT SYSTEM - CONTAINER STARTUP"
echo "================================================================="

# Synchronize Database Schema
if [ -f "./src/infrastructure/database/prisma/schema.prisma" ]; then
  echo "==> [Entrypoint] Synchronizing Database Schema with Prisma db push..."
  npx prisma db push --skip-generate --schema=./src/infrastructure/database/prisma/schema.prisma || {
    echo "==> [Entrypoint] Warning: Schema synchronization encountered an issue. Continuing..."
  }
fi

# Automatic Seeder execution on initial deployment
if [ "$AUTO_SEED" = "true" ]; then
  echo "==> [Entrypoint] AUTO_SEED=true detected. Populating seed accounts & operational data..."
  tsx ./src/infrastructure/database/prisma/seed.ts || {
    echo "==> [Entrypoint] Warning: Database seeding finished with warnings."
  }
fi

echo "==> [Entrypoint] Initializing Next.js Standalone Server on port ${PORT:-3000}..."
exec "$@"
