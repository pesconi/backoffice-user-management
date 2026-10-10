import { afterEach, describe, expect, it } from 'vitest';
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
                payload: { userId: 'not-a-uuid', password: 'ValidLength123!' },
            });
            expect(response.statusCode).toBe(400);
        }

        const response = await app.inject({
            method: 'POST',
            url: '/auth/sign-in',
            payload: { userId: 'not-a-uuid', password: 'ValidLength123!' },
        });

        expect(response.statusCode).toBe(429);
        expect(response.json()).toEqual({ error: 'Too many requests. Please try again later.' });
    });
});