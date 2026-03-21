import { APIRequestContext, expect } from '@playwright/test';

type RoleCred = {
  email: string;
  password: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getRetryDelayMs(retryAfterHeader: string | null, attemptIndex: number) {
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const baseDelay = Math.min(500 * 2 ** attemptIndex, 5000);
  const jitter = Math.floor(Math.random() * 250);
  return baseDelay + jitter;
}

async function getCsrfWithRetry(request: APIRequestContext, attempts = 6) {
  let lastResponse;

  for (let i = 0; i < attempts; i += 1) {
    const res = await request.get('/api/auth/csrf');
    if (res.ok()) {
      return res;
    }

    lastResponse = res;
    if (res.status() !== 429 || i === attempts - 1) {
      return res;
    }

    const retryAfter = res.headers()['retry-after'] ?? null;
    await sleep(getRetryDelayMs(retryAfter, i));
  }

  if (lastResponse) {
    return lastResponse;
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

  const callbackBaseUrl = new URL(csrfRes.url()).origin;

  const callbackRes = await request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email: cred.email,
      password: cred.password,
      callbackUrl: `${callbackBaseUrl}/dashboard`,
      json: 'true',
    },
  });

  expect([200, 302]).toContain(callbackRes.status());

  let lastSession: any = null;
  for (let i = 0; i < 6; i += 1) {
    const sessionRes = await request.get('/api/auth/session');
    expect(sessionRes.ok()).toBeTruthy();
    lastSession = await sessionRes.json();

    if (lastSession?.user?.email === cred.email && lastSession?.user?.role) {
      return lastSession;
    }

    await sleep(250 * (i + 1));
  }

  return lastSession;
}
