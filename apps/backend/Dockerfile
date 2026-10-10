FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install --no-install-recommends -y postgresql-client \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @backoffice/backend prisma:generate \
  && pnpm --filter @backoffice/backend build \
  && sed -i 's/\r$//' apps/backend/docker-entrypoint.sh \
  && chmod +x apps/backend/docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/app/apps/backend/docker-entrypoint.sh"]