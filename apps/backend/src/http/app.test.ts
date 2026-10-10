import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../database/prisma.js', () => ({
    prisma: { user: { findFirst: vi.fn().mockResolvedValue(null) } },
}));

import { buildApp } from './app.js';

describe('authentication rate limits', () => {
    const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

    afterEach(async () => {
        await Promise.all(apps.splice(0).map((app) => app.close()));
    });

    it('rejects the sixth sign-in attempt from the same client', async () => {
        const app = await buildApp();
        apps.push(app);

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/sign-in',
                payload: { email: 'missing@example.com', password: 'ValidLength123!' },
            });
            expect(response.statusCode).toBe(401);
        }

        const response = await app.inject({
            method: 'POST',
            url: '/auth/sign-in',
            payload: { email: 'missing@example.com', password: 'ValidLength123!' },
        });

        expect(response.statusCode).toBe(429);
        expect(response.json()).toEqual({ error: 'Too many requests. Please try again later.' });
    });
});

describe('protected user API contract', () => {
    const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
    const userId = 'a1b7d02a-8f28-4de0-91eb-ef8931aedc7f';

    afterEach(async () => {
        await Promise.all(apps.splice(0).map((app) => app.close()));
    });

    it.each([
        { method: 'GET', url: '/users' },
        { method: 'POST', url: '/users', payload: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', password: 'ValidPassword123!' } },
        { method: 'PATCH', url: `/users/${userId}`, payload: { firstName: 'Grace' } },
        { method: 'DELETE', url: `/users/${userId}` },
    ] as const)('requires a bearer session for $method $url', async ({ method, url, payload }) => {
        const app = await buildApp();
        apps.push(app);

        const response = await app.inject({ method, url, payload });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ error: 'A bearer session token is required.' });
    });

    it('rejects malformed authorization schemes before accessing users', async () => {
        const app = await buildApp();
        apps.push(app);

        const response = await app.inject({
            method: 'GET',
            url: '/users',
            headers: { authorization: 'Basic invalid-token' },
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ error: 'A bearer session token is required.' });
    });

    it('rejects unknown sign-in payload fields', async () => {
        const app = await buildApp();
        apps.push(app);

        const response = await app.inject({
            method: 'POST',
            url: '/auth/sign-in',
            payload: { email: 'missing@example.com', password: 'ValidPassword123!', userId: userId },
        });

        expect(response.statusCode).toBe(400);
    });
});