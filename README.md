# Backoffice User Management

A production-oriented back-office user management system with session-protected access, soft deletion, and database-backed pagination.

## Tech Stack

- Node.js 22, TypeScript, Fastify, Prisma, and PostgreSQL
- Next.js 15 App Router, Tailwind CSS, `next-themes`, and Lucide
- Vitest for domain tests and Playwright for end-to-end coverage
- pnpm workspaces, Docker, and Docker Compose

## How to Run

From a clean clone, run:

```sh
docker compose up --build
```

Open `http://localhost:3000` when startup completes.

Compose includes local development defaults, so an `.env` file is not required for evaluation. To override the database or seeded account credentials, copy `.env.example` to `.env` before startup. Never use the included defaults outside local development.

The backend is intentionally available only on the internal Compose network. The frontend is bound to `127.0.0.1:3000`, limiting the local evaluation instance to the host machine.

The Compose startup waits for PostgreSQL health, applies Prisma migrations, seeds the administrator, and starts both applications.

### Default Seeded Account

| Field | Value |
| --- | --- |
| Email | `admin@backoffice.local` |
| Password | `AdminPassword123!` |

Change `ADMIN_PASSWORD` in `.env` outside local evaluation.

## Technical Decisions & Architecture

### Soft Delete and Session Security

Users are soft-deleted through `deletedAt`, retaining the audit record while excluding the user from normal queries. Deactivation and soft deletion use Prisma transactions to terminate every active session immediately. Inactive users cannot create sessions or have their names changed.

### Pagination at the Database Boundary

The API accepts a page and enforces `limit=6`. It converts the page into Prisma `skip` and `take` values, executes `findMany` and `count` in one transaction, and returns the page metadata. The frontend never paginates a fully loaded in-memory user list.

### Session Handling

The backend treats the session UUID as the auth token. Both registration and sign-in establish a session. The frontend receives it only through a Next.js route handler, which stores it in an HttpOnly, SameSite cookie. Browser code cannot read the session ID; authenticated route handlers relay it to the backend as a Bearer token.

The dashboard follows the assessment assumption that an authenticated user is the operating administrator. Middleware validates the session with the backend before allowing protected routes or redirecting an authenticated user away from sign-in and sign-up pages.

### Email-Based Authentication

The assessment's user domain does not define a human-readable login identifier. The implementation adds a unique email address so users can sign in without retaining an internal UUID. Email is normalized to lowercase at the API boundary and protected by a database uniqueness constraint.

### Container Startup

PostgreSQL has a healthcheck. The backend entrypoint also waits with `pg_isready`, runs `npx prisma migrate deploy`, then `npx prisma db seed`, and finally starts the compiled server. The frontend depends on the backend healthcheck and talks to it over the Compose network.

## Validation

Run unit tests with `pnpm --filter @backoffice/backend test`. After starting the Compose stack, run browser flows with `pnpm test:e2e`. The browser suite covers registration with automatic sign-in, sign-in, terminated-session routing, user pagination, inactive-user validation, and theme persistence.