import { type User } from "@prisma/client";
import { type FastifyRequest } from "fastify";
import { UnauthorizedError } from "../domain/errors.js";
import { SessionService } from "../sessions/session.service.js";

declare module "fastify" {
  interface FastifyRequest {
    authenticatedUser?: User;
  }
}

export type RequireAuthenticatedUser = (
  request: FastifyRequest,
) => Promise<User>;

export const extractBearerToken = (request: FastifyRequest): string => {
  const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("A bearer session token is required.");
  }
  return token;
};

export const createRequireAuthenticatedUser = (
  sessionService: SessionService,
): RequireAuthenticatedUser => {
  return async (request) => {
    const { user } = await sessionService.requireActiveSession(
      extractBearerToken(request),
    );
    request.authenticatedUser = user;
    return user;
  };
};
