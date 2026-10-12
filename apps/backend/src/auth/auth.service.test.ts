import { UserStatus, type Session, type User } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { SessionService } from "../sessions/session.service.js";
import type { SessionRepository } from "../sessions/session.repository.js";
import type { UserRepository } from "../users/user.repository.js";
import { AuthService } from "./auth.service.js";
import type { PasswordHasher } from "./password-hasher.js";

const user: User = {
  id: "a1b7d02a-8f28-4de0-91eb-ef8931aedc7f",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  passwordHash: "hash",
  status: UserStatus.active,
  loginsCounter: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const session: Session = {
  id: "f1b7d02a-8f28-4de0-91eb-ef8931aedc7f",
  userId: user.id,
  createdAt: new Date(),
  expiresAt: new Date(),
  terminatedAt: null,
};

const users: UserRepository = {
  create: vi.fn().mockResolvedValue(user),
  createWithSession: vi.fn().mockResolvedValue({ user, session }),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  incrementLoginsCounter: vi.fn().mockResolvedValue(user),
  findPage: vi.fn(),
};

const sessions: SessionRepository = {
  create: vi.fn().mockResolvedValue(session),
  findActiveWithUser: vi.fn(),
  terminate: vi.fn(),
};

const passwordHasher: PasswordHasher = {
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn(),
};

describe("AuthService", () => {
  it("creates a session and increments the login count when registering a user", async () => {
    const service = new AuthService(
      users,
      new SessionService(sessions),
      passwordHasher,
    );

    await expect(
      service.signUp("Ada", "Lovelace", "ada@example.com", "ValidPassword123!"),
    ).resolves.toEqual({ user, session });

    expect(users.createWithSession).toHaveBeenCalledWith({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });
  });

  it("authenticates using an email address", async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(user);
    vi.mocked(passwordHasher.verify).mockResolvedValue(true);
    const service = new AuthService(
      users,
      new SessionService(sessions),
      passwordHasher,
    );

    await expect(
      service.signIn(user.email, "ValidPassword123!"),
    ).resolves.toEqual(session);

    expect(users.findByEmail).toHaveBeenCalledWith(user.email);
  });
});
