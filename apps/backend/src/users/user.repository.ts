import { PrismaClient, type Prisma, type User, UserStatus } from '@prisma/client';

export type CreateUserInput = Pick<User, 'firstName' | 'lastName' | 'passwordHash' | 'role'>;
export type UpdateUserInput = Partial<Pick<User, 'firstName' | 'lastName' | 'role' | 'status'>>;

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  update(id: string, input: UpdateUserInput): Promise<User>;
  softDelete(id: string): Promise<User>;
  incrementLoginsCounter(id: string): Promise<User>;
  findPage(skip: number, take: number): Promise<{ users: User[]; total: number }>;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data: input });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
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