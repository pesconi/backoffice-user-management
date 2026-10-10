import cors from '@fastify/cors';
import Fastify, { type FastifyRequest } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';
import { z, ZodError } from 'zod';
import { AuthService } from '../auth/auth.service.js';
import { argonPasswordHasher } from '../auth/password-hasher.js';
import { prisma } from '../database/prisma.js';
import { DomainError, ForbiddenError, UnauthorizedError, ValidationError } from '../domain/errors.js';
import { PrismaSessionRepository } from '../sessions/session.repository.js';
import { SessionService } from '../sessions/session.service.js';
import { PrismaUserRepository } from '../users/user.repository.js';
import { UserService } from '../users/user.service.js';

const passwordSchema = z.string().min(12).max(128);
const signUpSchema = z.object({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100), password: passwordSchema }).strict();
const signInSchema = z.object({ userId: z.uuid(), password: passwordSchema }).strict();
const createUserSchema = signUpSchema.extend({ role: z.enum(UserRole).default(UserRole.user) });
const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  status: z.enum(UserStatus).optional(),
  role: z.enum(UserRole).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
const idParamsSchema = z.object({ id: z.uuid() });
const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().default(6).refine((value) => value === 6, 'Limit must be 6.'),
});

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error.issues.map((issue) => issue.message).join(' '));
    }
    throw error;
  }
};

const extractBearerToken = (request: FastifyRequest): string => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('A bearer session token is required.');
  }
  return token;
};

export function buildApp() {
  const userRepository = new PrismaUserRepository(prisma);
  const sessionService = new SessionService(new PrismaSessionRepository(prisma));
  const users = new UserService(userRepository);
  const auth = new AuthService(userRepository, sessionService, argonPasswordHasher);
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error instanceof DomainError ? error.statusCode : 500;
    const message = error instanceof DomainError ? error.message : 'Internal server error.';
    reply.status(statusCode).send({ error: message });
  });

  const requireAdmin = async (request: FastifyRequest) => {
    const { user } = await sessionService.requireActiveSession(extractBearerToken(request));
    if (user.role !== UserRole.admin) {
      throw new ForbiddenError('Administrator access is required.');
    }
    return user;
  };

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/auth/sign-up', async (request, reply) => {
    const body = parse(signUpSchema, request.body);
    const user = await auth.signUp(body.firstName, body.lastName, body.password);
    return reply.status(201).send({ user });
  });

  app.post('/auth/sign-in', async (request) => {
    const body = parse(signInSchema, request.body);
    const session = await auth.signIn(body.userId, body.password);
    return { sessionId: session.id };
  });

  app.post('/auth/sign-out', async (request, reply) => {
    await sessionService.terminateSession(extractBearerToken(request));
    return reply.status(204).send();
  });

  app.get('/users', { preHandler: requireAdmin }, async (request) => {
    const { page, limit } = parse(usersQuerySchema, request.query);
    const { users: pageUsers, total } = await users.listUsers(page, limit);
    return { users: pageUsers, page, limit, total, totalPages: Math.ceil(total / limit) };
  });

  app.post('/users', { preHandler: requireAdmin }, async (request, reply) => {
    const body = parse(createUserSchema, request.body);
    const user = await users.createUser({
      firstName: body.firstName,
      lastName: body.lastName,
      passwordHash: await argonPasswordHasher.hash(body.password),
      role: body.role,
    });
    return reply.status(201).send({ user });
  });

  app.patch('/users/:id', { preHandler: requireAdmin }, async (request) => {
    const { id } = parse(idParamsSchema, request.params);
    const body = parse(updateUserSchema, request.body);
    return { user: await users.updateUser(id, body) };
  });

  app.delete('/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = parse(idParamsSchema, request.params);
    await users.softDeleteUser(id);
    return reply.status(204).send();
  });

  return app;
}