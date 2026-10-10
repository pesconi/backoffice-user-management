import { expect, test } from '@playwright/test';

const admin = { userId: '00000000-0000-4000-8000-000000000001', password: 'AdminPassword123!' };
const password = 'ManagedUser123!';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Account ID').fill(admin.userId);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe.configure({ mode: 'serial' });

test('signs in and persists a selected theme', async ({ page }) => {
  await signIn(page);
  const initialTheme = await page.locator('html').getAttribute('class');
  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
  await expect(page.locator('html')).not.toHaveAttribute('class', initialTheme ?? '');
  const selectedTheme = await page.locator('html').getAttribute('class');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('class', selectedTheme ?? '');
});

test('paginates users through the API at six records per page', async ({ page }) => {
  await signIn(page);
  const marker = Date.now();
  for (let index = 0; index < 6; index += 1) {
    const status = await page.evaluate(async ({ index, marker, password }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firstName: `Page${marker}`, lastName: `User${index}`, password, role: 'user' }),
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

test('blocks name changes for inactive users', async ({ page }) => {
  await signIn(page);
  const created = await page.evaluate(async ({ password }) => {
    const response = await fetch('/api/users', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Locked', lastName: 'Record', password, role: 'user' }),
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
});