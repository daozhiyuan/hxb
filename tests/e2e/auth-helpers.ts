import { APIRequestContext, expect } from '@playwright/test';

type RoleCred = {
  email: string;
  password: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCsrfWithRetry(request: APIRequestContext, attempts = 3) {
  let lastStatus: number | undefined;

  for (let i = 0; i < attempts; i += 1) {
    const res = await request.get('/api/auth/csrf');
    if (res.ok()) {
      return res;
    }

    lastStatus = res.status();
    if (lastStatus !== 429 || i === attempts - 1) {
      return res;
    }

    await sleep(300 * (i + 1));
  }

  throw new Error('unreachable');
}

export const roles: Record<'admin' | 'superadmin' | 'partner' | 'user', RoleCred> = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
  },
  superadmin: {
    email: process.env.E2E_SUPERADMIN_EMAIL || 'superadmin@example.com',
    password: process.env.E2E_SUPERADMIN_PASSWORD || 'superadmin123',
  },
  partner: {
    email: process.env.E2E_PARTNER_EMAIL || 'partner@example.com',
    password: process.env.E2E_PARTNER_PASSWORD || 'partner123',
  },
  user: {
    email: process.env.E2E_USER_EMAIL || 'user@example.com',
    password: process.env.E2E_USER_PASSWORD || 'user123',
  },
};

export async function loginByCredentials(request: APIRequestContext, cred: RoleCred) {
  const csrfRes = await getCsrfWithRetry(request);
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
