import { type FastifyInstance } from "fastify";
import { AuthService } from "../../auth/auth.service.js";
import { SessionService } from "../../sessions/session.service.js";
import { extractBearerToken } from "../authentication.js";
import { parse, toUserResponse } from "../http-helpers.js";
import { signInSchema, signUpSchema } from "../schemas/auth.schemas.js";

type AuthRouteDependencies = {
    auth: AuthService;
    sessionService: SessionService;
};

export async function registerAuthRoutes(
    app: FastifyInstance,
    { auth, sessionService }: AuthRouteDependencies,
) {
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
}