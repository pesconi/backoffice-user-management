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