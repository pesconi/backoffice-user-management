FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @backoffice/frontend build

USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@backoffice/frontend", "start"]