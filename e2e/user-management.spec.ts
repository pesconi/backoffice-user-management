import { expect, test } from '@playwright/test';

const admin = { email: 'admin@backoffice.local', password: 'AdminPassword123!' };
const password = 'ManagedUser123!';

async function signIn(page: import('@playwright/test').Page) {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(admin.email);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe.configure({ mode: 'serial' });

test('signs up, establishes a session, and opens the dashboard', async ({ page }) => {
    const marker = Date.now();
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-up$/);
    await page.getByLabel('First name').fill(`New${marker}`);
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(`new${marker}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
});

test('checks password confirmation before submitting registration', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByLabel('First name').fill('Mismatch');
    await page.getByLabel('Last name').fill('Check');
    await page.getByLabel('Email').fill('mismatch@example.com');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill('DifferentPassword123!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Passwords must match before registration.', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
});

test('signs in and persists a selected theme', async ({ page }) => {
    await signIn(page);
    const initialTheme = await page.locator('html').getAttribute('class');
    await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
    await expect(page.locator('html')).not.toHaveAttribute('class', initialTheme ?? '');
    const selectedTheme = await page.locator('html').getAttribute('class');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('class', selectedTheme ?? '');
    await page.goto('/sign-up');
    await expect(page).toHaveURL(/\/dashboard$/);
});

test('redirects a terminated session to sign-in before loading the dashboard', async ({ page, context }) => {
    await signIn(page);
    const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'session_id');
    expect(sessionCookie).toBeDefined();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await context.addCookies([{
        name: sessionCookie!.name,
        value: sessionCookie!.value,
        url: 'http://localhost:3000',
        httpOnly: sessionCookie!.httpOnly,
        secure: sessionCookie!.secure,
        sameSite: sessionCookie!.sameSite,
    }]);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in$/);
});

test('paginates users through the API at six records per page', async ({ page }) => {
    await signIn(page);
    const marker = Date.now();
    for (let index = 0; index < 6; index += 1) {
        const status = await page.evaluate(async ({ index, marker, password }) => {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ firstName: `Page${marker}`, lastName: `User${index}`, email: `page${marker}-${index}@example.com`, password }),
            });
            return response.status;
        }, { index, marker, password });
        expect(status).toBe(201);
    }
    await page.reload();
    await expect(page.locator('tbody tr')).toHaveCount(6);
    await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
});

test('manages a user through the dashboard and preserves creation time', async ({ page }) => {
    const marker = Date.now();
    const firstName = `Managed${marker}`;
    const updatedFirstName = `Updated${marker}`;

    await page.goto('/sign-up');
    await page.getByLabel('First name').fill(`Operator${marker}`);
    await page.getByLabel('Last name').fill('Account');
    await page.getByLabel('Email').fill(`operator${marker}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Add user' }).click();
    await page.getByLabel('First name').fill(firstName);
    await page.getByLabel('Last name').fill('Record');
    await page.getByLabel('Email').fill(`managed${marker}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByText(`${firstName} Record`)).toBeVisible();

    const createdUser = await page.evaluate(async (name) => {
        const response = await fetch('/api/users?page=1');
        const payload = await response.json();
        return payload.users.find((user: { firstName: string }) => user.firstName === name);
    }, firstName);
    expect(createdUser).toBeDefined();

    await page.getByRole('button', { name: `Edit ${firstName} Record` }).click();
    await page.getByLabel('First name').fill(updatedFirstName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(`${updatedFirstName} Record`)).toBeVisible();

    const managedUser = await page.evaluate(async (name) => {
        const response = await fetch('/api/users?page=1');
        const payload = await response.json();
        return payload.users.find((user: { firstName: string }) => user.firstName === name);
    }, updatedFirstName);
    expect(managedUser).toBeDefined();
    expect(managedUser.createdAt).toBe(createdUser.createdAt);
    expect(new Date(managedUser.updatedAt).getTime()).toBeGreaterThan(new Date(createdUser.updatedAt).getTime());

    const timestampStatus = await page.evaluate(async ({ id }) => {
        const response = await fetch(`/api/users/${id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ createdAt: '2000-01-01T00:00:00.000Z' }),
        });
        return response.status;
    }, managedUser);
    expect(timestampStatus).toBe(400);

    const deleteResponse = page.waitForResponse((response) => response.url().endsWith(`/api/users/${managedUser.id}`)
        && response.request().method() === 'DELETE');
    await page.getByRole('button', { name: `Delete ${updatedFirstName} Record` }).click();
    await page.getByRole('button', { name: 'Remove user' }).click();
    expect((await deleteResponse).status()).toBe(204);
    await page.reload();
    await expect(page.getByText(`${updatedFirstName} Record`)).not.toBeVisible();
});

test('blocks name changes for inactive users', async ({ page }) => {
    await signIn(page);
    const created = await page.evaluate(async ({ password }) => {
        const response = await fetch('/api/users', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ firstName: 'Locked', lastName: 'Record', email: `locked${Date.now()}@example.com`, password }),
        });
        return response.json();
    }, { password });
    const deactivateStatus = await page.evaluate(async (userId) => {
        const response = await fetch(`/api/users/${userId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'inactive' }) });
        return response.status;
    }, created.user.id);
    expect(deactivateStatus).toBe(200);
    const nameUpdateStatus = await page.evaluate(async (userId) => {
        const response = await fetch(`/api/users/${userId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ firstName: 'Denied' }) });
        return response.status;
    }, created.user.id);
    expect(nameUpdateStatus).toBe(403);
    const signInStatus = await page.evaluate(async ({ email, password }) => {
        const response = await fetch('/api/auth/sign-in', {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
        });
        return response.status;
    }, { email: created.user.email, password });
    expect(signInStatus).toBe(403);
});