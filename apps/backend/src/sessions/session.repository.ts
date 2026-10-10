import { PrismaClient, type Session, type User } from '@prisma/client';

export type ActiveSession = Session & { user: User };

export interface SessionRepository {
  create(userId: string): Promise<Session>;
  findActiveWithUser(sessionId: string): Promise<ActiveSession | null>;
  terminate(sessionId: string): Promise<void>;
}

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(userId: string): Promise<Session> {
    return this.prisma.session.create({ data: { userId } });
  }

  findActiveWithUser(sessionId: string): Promise<ActiveSession | null> {
    return this.prisma.session.findFirst({
      where: { id: sessionId, terminatedAt: null, user: { deletedAt: null } },
      include: { user: true },
    });
  }

  async terminate(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, terminatedAt: null },
      data: { terminatedAt: new Date() },
    });
  }
}