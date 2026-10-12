import { type FastifyInstance } from "fastify";
import { argonPasswordHasher } from "../../auth/password-hasher.js";
import { UserService } from "../../users/user.service.js";
import { type RequireAuthenticatedUser } from "../authentication.js";
import { parse, toUserResponse } from "../http-helpers.js";
import {
  createUserSchema,
  idParamsSchema,
  updateUserSchema,
  usersQuerySchema,
} from "../schemas/user.schemas.js";

type UserRouteDependencies = {
  users: UserService;
  requireAuthenticatedUser: RequireAuthenticatedUser;
};

export async function registerUserRoutes(
  app: FastifyInstance,
  { users, requireAuthenticatedUser }: UserRouteDependencies,
) {
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
}
