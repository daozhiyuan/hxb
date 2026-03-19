import { test, expect, request } from '@playwright/test';
import { loginByCredentials, roles } from './auth-helpers';

test('匿名访问受保护 API 返回 401', async ({ request }) => {
  const res = await request.get('/api/crm/customers');
  expect(res.status()).toBe(401);
});

test('ADMIN 不能访问 /api/admin/settings（应 403）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.admin);
  expect(session?.user?.role).toBe('ADMIN');

  const settingsRes = await ctx.get('/api/admin/settings');
  expect(settingsRes.status()).toBe(403);
  await ctx.dispose();
});

test('SUPER_ADMIN 可以访问 /api/admin/settings（应 200）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.superadmin);
  expect(session?.user?.role).toBe('SUPER_ADMIN');

  const settingsRes = await ctx.get('/api/admin/settings');
  expect(settingsRes.status()).toBe(200);
  await ctx.dispose();
});

test('USER 不能访问管理员客户详情（应 403）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.user);
  expect(session?.user?.role).toBe('USER');

  const adminCustomerRes = await ctx.get('/api/admin/customers/1');
  expect(adminCustomerRes.status()).toBe(403);
  await ctx.dispose();
});
