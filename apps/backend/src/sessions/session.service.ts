import { UserStatus, type Session, type User } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../domain/errors.js';
import { type SessionRepository } from './session.repository.js';

export class SessionService {
  constructor(private readonly sessions: SessionRepository) {}

  async createSession(user: User): Promise<Session> {
    if (user.status === UserStatus.inactive) {
      throw new ForbiddenError('Inactive users cannot create sessions.');
    }
    return this.sessions.create(user.id);
  }

  async requireActiveSession(sessionId: string): Promise<{ user: User; session: Session }> {
    const activeSession = await this.sessions.findActiveWithUser(sessionId);
    if (!activeSession || activeSession.user.status === UserStatus.inactive) {
      throw new UnauthorizedError('Session is invalid or has been terminated.');
    }
    return { user: activeSession.user, session: activeSession };
  }

  terminateSession(sessionId: string): Promise<void> {
    return this.sessions.terminate(sessionId);
  }
}