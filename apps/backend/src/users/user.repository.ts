import { PrismaClient, Prisma, type Session, type User, UserStatus } from '@prisma/client';
import { ConflictError } from '../domain/errors.js';

export type CreateUserInput = Pick<User, 'firstName' | 'lastName' | 'email' | 'passwordHash'>;
export type UpdateUserInput = Partial<Pick<User, 'firstName' | 'lastName' | 'status'>>;

export interface UserRepository {
    create(input: CreateUserInput): Promise<User>;
    createWithSession(input: CreateUserInput): Promise<{ user: User; session: Session }>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    update(id: string, input: UpdateUserInput): Promise<User>;
    softDelete(id: string): Promise<User>;
    incrementLoginsCounter(id: string): Promise<User>;
    findPage(skip: number, take: number): Promise<{ users: User[]; total: number }>;
}

export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async create(input: CreateUserInput): Promise<User> {
        try {
            return await this.prisma.user.create({ data: input });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictError('An account with this email already exists.');
            }
            throw error;
        }
    }

    async createWithSession(input: CreateUserInput): Promise<{ user: User; session: Session }> {
        try {
            return await this.prisma.$transaction(async (transaction) => {
                const user = await transaction.user.create({ data: input });
                const session = await transaction.session.create({ data: { userId: user.id } });
                const registeredUser = await transaction.user.update({
                    where: { id: user.id },
                    data: { loginsCounter: { increment: 1 } },
                });
                return { user: registeredUser, session };
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictError('An account with this email already exists.');
            }
            throw error;
        }
    }

    findById(id: string): Promise<User | null> {
        return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    }

    findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    }

    async update(id: string, input: UpdateUserInput): Promise<User> {
        if (input.status !== UserStatus.inactive) {
            return this.prisma.user.update({ where: { id }, data: input });
        }

        const terminatedAt = new Date();
        const [user] = await this.prisma.$transaction([
            this.prisma.user.update({ where: { id }, data: input }),
            this.prisma.session.updateMany({
                where: { userId: id, terminatedAt: null },
                data: { terminatedAt },
            }),
        ]);
        return user;
    }

    async softDelete(id: string): Promise<User> {
        const terminatedAt = new Date();
        const [user] = await this.prisma.$transaction([
            this.prisma.user.update({ where: { id }, data: { deletedAt: terminatedAt } }),
            this.prisma.session.updateMany({
                where: { userId: id, terminatedAt: null },
                data: { terminatedAt },
            }),
        ]);
        return user;
    }

    incrementLoginsCounter(id: string): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data: { loginsCounter: { increment: 1 } },
        });
    }

    async findPage(skip: number, take: number): Promise<{ users: User[]; total: number }> {
        const where: Prisma.UserWhereInput = { deletedAt: null };
        const [users, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
            this.prisma.user.count({ where }),
        ]);
        return { users, total };
    }

}