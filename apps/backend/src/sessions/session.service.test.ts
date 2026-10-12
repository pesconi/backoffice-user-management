import { UserStatus, type Session, type User } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "../domain/errors.js";
import { SessionService } from "./session.service.js";
import type { SessionRepository } from "./session.repository.js";

const user: User = {
  id: "a1b7d02a-8f28-4de0-91eb-ef8931aedc7f",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  passwordHash: "hash",
  status: UserStatus.inactive,
  loginsCounter: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const sessions: SessionRepository = {
  create: vi.fn(),
  findActiveWithUser: vi.fn(),
  terminate: vi.fn(),
};

describe("SessionService", () => {
  it("prevents inactive users from creating a session", async () => {
    const service = new SessionService(sessions);

    await expect(service.createSession(user)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it("rejects expired sessions even when a repository returns one", async () => {
    const activeUser = { ...user, status: UserStatus.active };
    const expiredSession: Session = {
      id: "a1b7d02a-8f28-4de0-91eb-ef8931aedc7f",
      userId: activeUser.id,
      createdAt: new Date(Date.now() - 32_400_000),
      expiresAt: new Date(Date.now() - 3_600_000),
      terminatedAt: null,
    };
    vi.mocked(sessions.findActiveWithUser).mockResolvedValue({
      ...expiredSession,
      user: activeUser,
    });
    const service = new SessionService(sessions);

    await expect(
      service.requireActiveSession(expiredSession.id),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
