import { UserRole, UserStatus, type PrismaClient, type User } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaUserRepository } from './user.repository.js';

const user: User = {
    id: 'a1b7d02a-8f28-4de0-91eb-ef8931aedc7f', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', passwordHash: 'hash', status: UserStatus.active,
    role: UserRole.user, loginsCounter: 0, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
};

const prismaMock = () => {
    const update = vi.fn().mockReturnValue('user-update');
    const updateMany = vi.fn().mockReturnValue('session-update');
    return {
        user: { update },
        session: { updateMany },
        $transaction: vi.fn().mockResolvedValue([user, { count: 2 }]),
    };
};

describe('PrismaUserRepository', () => {
    it('terminates active sessions atomically when a user becomes inactive', async () => {
        const prisma = prismaMock();
        const repository = new PrismaUserRepository(prisma as unknown as PrismaClient);

        await repository.update(user.id, { status: UserStatus.inactive });

        expect(prisma.$transaction).toHaveBeenCalledWith(['user-update', 'session-update']);
        expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: user.id, terminatedAt: null },
            data: { terminatedAt: expect.any(Date) },
        }));
    });

    it('terminates active sessions atomically when a user is soft-deleted', async () => {
        const prisma = prismaMock();
        const repository = new PrismaUserRepository(prisma as unknown as PrismaClient);

        await repository.softDelete(user.id);

        expect(prisma.$transaction).toHaveBeenCalledWith(['user-update', 'session-update']);
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: user.id },
            data: { deletedAt: expect.any(Date) },
        }));
    });
});