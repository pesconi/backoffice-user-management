#!/bin/sh
set -eu

until pg_isready -h db -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

cd /app/apps/backend
npx prisma migrate deploy
npx prisma db seed
exec node dist/index.js