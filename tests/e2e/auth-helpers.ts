import { APIRequestContext, expect } from '@playwright/test';

type RoleCred = {
  email: string;
  password: string;
};

export const roles: Record<'admin' | 'superadmin' | 'user', RoleCred> = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
  },
  superadmin: {
    email: process.env.E2E_SUPERADMIN_EMAIL || 'superadmin@example.com',
    password: process.env.E2E_SUPERADMIN_PASSWORD || 'superadmin123',
  },
  user: {
    email: process.env.E2E_USER_EMAIL || 'user@example.com',
    password: process.env.E2E_USER_PASSWORD || 'user123',
  },
};

export async function loginByCredentials(request: APIRequestContext, cred: RoleCred) {
  const csrfRes = await request.get('/api/auth/csrf');
  expect(csrfRes.ok()).toBeTruthy();
  const { csrfToken } = await csrfRes.json();

  const callbackRes = await request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email: cred.email,
      password: cred.password,
      callbackUrl: `${process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'}/dashboard`,
      json: 'true',
    },
  });

  expect([200, 302]).toContain(callbackRes.status());

  const sessionRes = await request.get('/api/auth/session');
  expect(sessionRes.ok()).toBeTruthy();
  return sessionRes.json();
}
