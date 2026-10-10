# Acceptance Test Matrix

This document maps every assessment requirement to an executable check or a short delivery review. For a clean acceptance environment, remove the local Compose data before running the automated checks; this also removes the local test database and resets the rate-limit store.

```sh
docker compose down -v
docker compose up --build
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm build
```

## Automated Behavior Checks

| ID | Requirement | Verification | Test location |
| --- | --- | --- | --- |
| BE-01 | Create a user and persist the defined user fields | Registration creates a user with a unique email address, password hash, session, and login count | `apps/backend/src/auth/auth.service.test.ts` |
| BE-02 | Creation time is immutable and last-update time changes | The API rejects `createdAt`; Prisma owns `updatedAt` | `e2e/user-management.spec.ts` |
| BE-03 | Inactive users cannot change their first or last name | API and dashboard update are rejected after deactivation | `apps/backend/src/users/user.service.test.ts`, `e2e/user-management.spec.ts` |
| BE-04 | Inactive users cannot create sessions | The session service rejects the user and sign-in returns `403` | `apps/backend/src/sessions/session.service.test.ts`, `e2e/user-management.spec.ts` |
| BE-05 | Create and terminate sessions | Registration and sign-in create sessions; sign-out invalidates the cookie token | `apps/backend/src/auth/auth.service.test.ts`, `e2e/user-management.spec.ts` |
| BE-06 | Remove a user safely | Soft deletion and deactivation terminate active sessions in database transactions | `apps/backend/src/users/user.repository.test.ts` |
| UI-01 | No session opens sign-up; passwords must match before registration | The root route opens sign-up and mismatch is caught before a backend call | `e2e/user-management.spec.ts` |
| UI-02 | Sign-up and email sign-in create a session and open the dashboard | Both flows are covered from the browser | `e2e/user-management.spec.ts` |
| UI-03 | Active sessions bypass sign-in/sign-up; stale sessions are denied | Middleware redirects active users to the dashboard and terminated sessions to sign-in | `e2e/user-management.spec.ts` |
| UI-04 | Dashboard can list, create, update, and delete users | The browser performs all four operations through visible controls | `e2e/user-management.spec.ts` |
| UI-05 | List pagination contains six users per page | The dashboard renders six rows and navigates to the next page | `e2e/user-management.spec.ts` |
| UI-06 | Theme survives reopening the application | A selected theme remains after reload | `e2e/user-management.spec.ts` |

## Delivery Review

| ID | Requirement | Check |
| --- | --- | --- |
| DL-01 | Node.js 22+, TypeScript 5+, Next.js 15+, Playwright 1.50+ | Review `package.json` files and run `pnpm typecheck`. |
| DL-02 | Containerized application | Run `docker compose up --build`, then open `http://localhost:3000`. |
| DL-03 | Project documentation in English | Review `README.md` and this matrix. |
| DL-04 | Git repository with granular history | Run `git log --oneline`. |
| DL-05 | No assessment branding in the deliverable | Review tracked files for assessment branding; no such references should be present. |