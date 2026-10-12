import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyRequest } from "fastify";
import { type User, UserStatus } from "@prisma/client";
import { z, ZodError } from "zod";
import { AuthService } from "../auth/auth.service.js";
import { argonPasswordHasher } from "../auth/password-hasher.js";
import { prisma } from "../database/prisma.js";
import {
  DomainError,
  UnauthorizedError,
  ValidationError,
} from "../domain/errors.js";
import { PrismaSessionRepository } from "../sessions/session.repository.js";
import { SessionService } from "../sessions/session.service.js";
import { PrismaUserRepository } from "../users/user.repository.js";
import { UserService } from "../users/user.service.js";

const passwordSchema = z.string().min(12).max(128);
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((email) => email.toLowerCase());
const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();
const signInSchema = z
  .object({ email: emailSchema, password: passwordSchema })
  .strict();
const createUserSchema = signUpSchema;
const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    status: z.enum(UserStatus).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );
const idParamsSchema = z.object({ id: z.uuid() });
const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .default(6)
    .refine((value) => value === 6, "Limit must be 6."),
});

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        error.issues.map((issue) => issue.message).join(" "),
      );
    }
    throw error;
  }
};

const extractBearerToken = (request: FastifyRequest): string => {
  const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("A bearer session token is required.");
  }
  return token;
};

const toUserResponse = ({
  passwordHash: _passwordHash,
  ...user
}: Awaited<ReturnType<PrismaUserRepository["create"]>>) => user;

const isHttpError = (error: unknown): error is { statusCode: number } =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  typeof error.statusCode === "number";

declare module "fastify" {
  interface FastifyRequest {
    authenticatedUser?: User;
  }
}

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

  const requireAuthenticatedUser = async (request: FastifyRequest) => {
    const { user } = await sessionService.requireActiveSession(
      extractBearerToken(request),
    );
    request.authenticatedUser = user;
    return user;
  };

  app.get("/health", async () => ({ status: "ok" }));

  app.post(
    "/auth/sign-up",
    { config: { rateLimit: { max: 3, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const body = parse(signUpSchema, request.body);
      const { user, session } = await auth.signUp(
        body.firstName,
        body.lastName,
        body.email,
        body.password,
      );
      return reply
        .status(201)
        .send({ user: toUserResponse(user), sessionId: session.id });
    },
  );

  app.post(
    "/auth/sign-in",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) => {
      const body = parse(signInSchema, request.body);
      const session = await auth.signIn(body.email, body.password);
      return { sessionId: session.id };
    },
  );

  app.post("/auth/sign-out", async (request, reply) => {
    await sessionService.terminateSession(extractBearerToken(request));
    return reply.status(204).send();
  });

  app.get("/auth/session", async (request) => {
    const { user } = await sessionService.requireActiveSession(
      extractBearerToken(request),
    );
    return { user: toUserResponse(user) };
  });

  app.get(
    "/users",
    { preHandler: requireAuthenticatedUser },
    async (request) => {
      const { page, limit } = parse(usersQuerySchema, request.query);
      const { users: pageUsers, total } = await users.listUsers(page, limit);
      return {
        users: pageUsers.map(toUserResponse),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    },
  );

  app.post(
    "/users",
    { preHandler: requireAuthenticatedUser },
    async (request, reply) => {
      const body = parse(createUserSchema, request.body);
      const user = await users.createUser({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        passwordHash: await argonPasswordHasher.hash(body.password),
      });
      return reply.status(201).send({ user: toUserResponse(user) });
    },
  );

  app.patch(
    "/users/:id",
    { preHandler: requireAuthenticatedUser },
    async (request) => {
      const { id } = parse(idParamsSchema, request.params);
      const body = parse(updateUserSchema, request.body);
      return { user: toUserResponse(await users.updateUser(id, body)) };
    },
  );

  app.delete(
    "/users/:id",
    { preHandler: requireAuthenticatedUser },
    async (request, reply) => {
      const { id } = parse(idParamsSchema, request.params);
      await users.softDeleteUser(id, request.authenticatedUser!.id);
      return reply.status(204).send();
    },
  );

  return app;
}
