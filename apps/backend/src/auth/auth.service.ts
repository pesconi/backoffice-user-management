import { UserRole, type Session, type User } from '@prisma/client';
import { UnauthorizedError } from '../domain/errors.js';
import { SessionService } from '../sessions/session.service.js';
import { type UserRepository } from '../users/user.repository.js';
import { type PasswordHasher } from './password-hasher.js';

export class AuthService {
    constructor(
        private readonly users: UserRepository,
        private readonly sessions: SessionService,
        private readonly passwordHasher: PasswordHasher,
    ) { }

    async signUp(firstName: string, lastName: string, password: string): Promise<User> {
        return this.users.create({
            firstName,
            lastName,
            passwordHash: await this.passwordHasher.hash(password),
            role: UserRole.user,
        });
    }

    async signIn(userId: string, password: string): Promise<Session> {
        const user = await this.users.findById(userId);
        if (!user || !(await this.passwordHasher.verify(user.passwordHash, password))) {
            throw new UnauthorizedError('Invalid credentials.');
        }

        const session = await this.sessions.createSession(user);
        await this.users.incrementLoginsCounter(user.id);
        return session;
    }
}