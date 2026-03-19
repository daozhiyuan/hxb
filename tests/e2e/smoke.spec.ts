import { test, expect } from '@playwright/test';

test('健康接口可用', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.status).toBe('OK');
});

test('登录页可访问并包含账号输入框', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
});

test('凭证登录后可访问 dashboard', async ({ page, request }) => {
  const csrfRes = await request.get('/api/auth/csrf');
  expect(csrfRes.ok()).toBeTruthy();
  const csrfJson = await csrfRes.json();
  const csrfToken: string = csrfJson.csrfToken;

  const loginRes = await request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email: process.env.E2E_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
      callbackUrl: `${process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'}/dashboard`,
      json: 'true',
    },
  });

  expect([200, 302]).toContain(loginRes.status());

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);
});
