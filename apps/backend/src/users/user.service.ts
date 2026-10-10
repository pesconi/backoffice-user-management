import { type User, UserRole, UserStatus } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../domain/errors.js';
import { type CreateUserInput, type UpdateUserInput, type UserRepository } from './user.repository.js';

export class UserService {
    constructor(private readonly users: UserRepository) { }

    createUser(input: CreateUserInput): Promise<User> {
        return this.users.create(input);
    }

    async updateUser(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
        const user = await this.getUser(id);
        const isChangingName = input.firstName !== undefined || input.lastName !== undefined;

        if (user.status === UserStatus.inactive && isChangingName) {
            throw new ForbiddenError('Inactive users cannot have their name changed.');
        }

        const removesAdminAccess = input.status === UserStatus.inactive || input.role === UserRole.user;
        if (user.role === UserRole.admin && removesAdminAccess) {
            if (id === actorId) {
                throw new ForbiddenError('Administrators cannot remove their own access.');
            }
            await this.ensureAnotherActiveAdmin(user);
        }

        // Prisma's @updatedAt is the sole timestamp authority; createdAt is never accepted here.
        return this.users.update(id, input);
    }

    async softDeleteUser(id: string, actorId: string): Promise<User> {
        const user = await this.getUser(id);
        if (id === actorId) {
            throw new ForbiddenError('Administrators cannot delete their own account.');
        }
        if (user.role === UserRole.admin) {
            await this.ensureAnotherActiveAdmin(user);
        }
        return this.users.softDelete(id);
    }

    async listUsers(page: number, limit: number): Promise<{ users: User[]; total: number }> {
        return this.users.findPage((page - 1) * limit, limit);
    }

    private async getUser(id: string): Promise<User> {
        const user = await this.users.findById(id);
        if (!user) {
            throw new NotFoundError('User not found.');
        }
        return user;
    }

    private async ensureAnotherActiveAdmin(user: User): Promise<void> {
        if (user.status === UserStatus.active && await this.users.countActiveAdmins() <= 1) {
            throw new ForbiddenError('At least one active administrator must remain.');
        }
    }
}