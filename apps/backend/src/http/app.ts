import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { AuthService } from "../auth/auth.service.js";
import { argonPasswordHasher } from "../auth/password-hasher.js";
import { prisma } from "../database/prisma.js";
import { DomainError } from "../domain/errors.js";
import { PrismaSessionRepository } from "../sessions/session.repository.js";
import { SessionService } from "../sessions/session.service.js";
import { PrismaUserRepository } from "../users/user.repository.js";
import { UserService } from "../users/user.service.js";
import { createRequireAuthenticatedUser } from "./authentication.js";
import { isHttpError } from "./http-helpers.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerUserRoutes } from "./routes/user.routes.js";

export async function buildApp() {
  const userRepository = new PrismaUserRepository(prisma);
  const sessionService = new SessionService(
    new PrismaSessionRepository(prisma),
  );
  const users = new UserService(userRepository);
  const auth = new AuthService(
    userRepository,
    sessionService,
    argonPasswordHasher,
  );
  const requireAuthenticatedUser =
    createRequireAuthenticatedUser(sessionService);
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  });
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) => ({
      statusCode: context.statusCode,
      error: "Too many requests. Please try again later.",
    }),
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode =
      error instanceof DomainError
        ? error.statusCode
        : isHttpError(error)
          ? error.statusCode
          : 500;
    const message =
      statusCode === 429
        ? "Too many requests. Please try again later."
        : error instanceof DomainError
          ? error.message
          : "Internal server error.";
    reply.status(statusCode).send({ error: message });
  });

  app.get("/health", async () => ({ status: "ok" }));

  await registerAuthRoutes(app, { auth, sessionService });
  await registerUserRoutes(app, { users, requireAuthenticatedUser });

  return app;
}
