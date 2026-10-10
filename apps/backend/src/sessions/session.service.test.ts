import { UserRole, UserStatus, type Session, type User } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../domain/errors.js';
import { SessionService } from './session.service.js';
import type { SessionRepository } from './session.repository.js';

const user: User = {
    id: 'a1b7d02a-8f28-4de0-91eb-ef8931aedc7f', firstName: 'Ada', lastName: 'Lovelace', passwordHash: 'hash', status: UserStatus.inactive,
    role: UserRole.user, loginsCounter: 0, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
};

const sessions: SessionRepository = {
    create: vi.fn(),
    findActiveWithUser: vi.fn(),
    terminate: vi.fn(),
};

describe('SessionService', () => {
    it('prevents inactive users from creating a session', async () => {
        const service = new SessionService(sessions);

        await expect(service.createSession(user)).rejects.toBeInstanceOf(ForbiddenError);
        expect(sessions.create).not.toHaveBeenCalled();
    });
});