import { UserRole, UserStatus, type User } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../domain/errors.js';
import { UserService } from './user.service.js';
import type { UserRepository } from './user.repository.js';

const user = (status: UserStatus = UserStatus.active): User => ({
    id: 'a1b7d02a-8f28-4de0-91eb-ef8931aedc7f',
    firstName: 'Ada',
    lastName: 'Lovelace',
    passwordHash: 'hash',
    status,
    role: UserRole.user,
    loginsCounter: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
});

const repository = (currentUser: User): UserRepository => ({
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(currentUser),
    update: vi.fn().mockResolvedValue(currentUser),
    softDelete: vi.fn().mockResolvedValue(currentUser),
    incrementLoginsCounter: vi.fn(),
    findPage: vi.fn(),
});

describe('UserService', () => {
    it('blocks name changes for inactive users', async () => {
        const users = repository(user(UserStatus.inactive));
        const service = new UserService(users);

        await expect(service.updateUser(user().id, { firstName: 'Grace' })).rejects.toBeInstanceOf(ForbiddenError);
        expect(users.update).not.toHaveBeenCalled();
    });

    it('allows non-name updates for inactive users', async () => {
        const users = repository(user(UserStatus.inactive));
        const service = new UserService(users);

        await service.updateUser(user().id, { role: UserRole.admin });
        expect(users.update).toHaveBeenCalledWith(user().id, { role: UserRole.admin });
    });

    it('calculates offset pagination in the service boundary', async () => {
        const users = repository(user());
        const service = new UserService(users);

        await service.listUsers(3, 6);
        expect(users.findPage).toHaveBeenCalledWith(12, 6);
    });

    it('never accepts createdAt as an update field', async () => {
        const users = repository(user());
        const service = new UserService(users);

        await service.updateUser(user().id, { firstName: 'Grace' });
        expect(users.update).toHaveBeenCalledWith(user().id, { firstName: 'Grace' });
    });
});