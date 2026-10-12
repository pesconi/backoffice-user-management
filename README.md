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

The Compose startup waits for PostgreSQL health, applies Prisma migrations, seeds the local account, and starts both applications.

### Default Seeded Account

| Field    | Value                    |
| -------- | ------------------------ |
| Email    | `admin@backoffice.local` |
| Password | `AdminPassword123!`      |

Change `ADMIN_PASSWORD` in `.env` outside local evaluation.

## Technical Decisions & Architecture

### Soft Delete and Session Security

Users are soft-deleted through `deletedAt`, retaining the audit record while excluding the user from normal queries. Deactivation and soft deletion use Prisma transactions to terminate every active session immediately. Inactive users cannot create sessions or have their names changed.

### Pagination at the Database Boundary

The API accepts a page and enforces `limit=6`. It converts the page into Prisma `skip` and `take` values, executes `findMany` and `count` in one transaction, and returns the page metadata. The frontend never paginates a fully loaded in-memory user list.

### Session Handling

The backend treats the session UUID as the auth token. Both registration and sign-in establish a session. The frontend receives it only through a Next.js route handler, which stores it in an HttpOnly, SameSite cookie. Browser code cannot read the session ID; authenticated route handlers relay it to the backend as a Bearer token.

The dashboard follows the assessment assumption that an authenticated user is the operating administrator. The model intentionally has no role field because the assessment defines no role-based access-control requirement. Middleware validates the session with the backend before allowing protected routes or redirecting an authenticated user away from sign-in and sign-up pages.

### Email-Based Authentication

The assessment's user domain does not define a human-readable login identifier. The implementation adds a unique email address so users can sign in without retaining an internal UUID. Email is normalized to lowercase at the API boundary and protected by a database uniqueness constraint.

### Container Startup

PostgreSQL has a healthcheck. The backend entrypoint also waits with `pg_isready`, runs `npx prisma migrate deploy`, then `npx prisma db seed`, and finally starts the compiled server. The frontend depends on the backend healthcheck and talks to it over the Compose network.

## Limitations and Production Next Steps

This assessment intentionally treats every authenticated user as a back-office operator. A production deployment should introduce tenant ownership, a role model, an explicit administrator bootstrap process, and authorization policies for every management action.

Session IDs are opaque UUID bearer tokens stored in the local database. A production session design should generate high-entropy tokens, persist only their hashes, rotate them on authentication-sensitive events, and define a distributed session and rate-limit store for horizontally scaled deployments. The frontend proxy limits session cookies to `HttpOnly` and `SameSite`, but production should also apply explicit origin checks and CSRF protections to state-changing routes.

The fixed six-record interface deliberately uses offset pagination: it is simple and appropriate for this bounded directory, but offset cost and page drift grow with large, frequently written datasets. A larger directory should move to cursor pagination using a stable ordering such as `(createdAt, id)`.

Rate limiting is process-local in this Compose deployment. A horizontally scaled deployment should use a shared store such as Redis and apply policies by route, IP address, account identity, and tenant where applicable.

The included Docker Compose configuration and seed account are intended for local evaluation only. Production operations also require managed secrets, structured logs with correlation IDs, metrics and tracing, SLO-based alerting, backups with restore drills, and a deployment-specific security review.

## Validation

Run unit tests with `pnpm --filter @backoffice/backend test`. After starting the Compose stack, run browser flows with `pnpm test:e2e`. The browser suite covers registration with automatic sign-in, sign-in, terminated-session routing, user pagination, inactive-user validation, and theme persistence.
