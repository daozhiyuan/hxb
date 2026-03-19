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

test('ADMIN 可以访问系统概览 API（应 200）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.admin);
  expect(session?.user?.role).toBe('ADMIN');

  const overviewRes = await ctx.get('/api/admin/system-overview');
  expect(overviewRes.status()).toBe(200);
  const body = await overviewRes.json();
  expect(body?.runtime?.status).toBe('OK');
  await ctx.dispose();
});

test('ADMIN 可以访问管理员客户列表（应 200）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.admin);
  expect(session?.user?.role).toBe('ADMIN');

  const adminCustomersRes = await ctx.get('/api/admin/customers?page=1&pageSize=3');
  expect(adminCustomersRes.status()).toBe(200);
  const body = await adminCustomersRes.json();
  expect(Array.isArray(body?.data)).toBe(true);
  expect(body?.pagination?.page).toBe(1);
  await ctx.dispose();
});

test('SUPER_ADMIN 也可以访问系统概览 API（应 200）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.superadmin);
  expect(session?.user?.role).toBe('SUPER_ADMIN');

  const overviewRes = await ctx.get('/api/admin/system-overview');
  expect(overviewRes.status()).toBe(200);
  const body = await overviewRes.json();
  expect(body?.runtime?.status).toBe('OK');
  await ctx.dispose();
});

test('PARTNER 可访问申诉列表但不能访问管理员能力接口', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.partner);
  expect(session?.user?.role).toBe('PARTNER');

  const appealsRes = await ctx.get('/api/appeals?page=1&pageSize=3');
  expect(appealsRes.status()).toBe(200);

  const adminCustomersRes = await ctx.get('/api/admin/customers?page=1&pageSize=3');
  expect(adminCustomersRes.status()).toBe(403);

  const adminCustomerRes = await ctx.get('/api/admin/customers/1');
  expect(adminCustomerRes.status()).toBe(403);

  const overviewRes = await ctx.get('/api/admin/system-overview');
  expect(overviewRes.status()).toBe(403);

  const settingsRes = await ctx.get('/api/admin/settings');
  expect(settingsRes.status()).toBe(403);
  await ctx.dispose();
});

test('USER 不能访问管理员设置与系统概览 API（应 403）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.user);
  expect(session?.user?.role).toBe('USER');

  const overviewRes = await ctx.get('/api/admin/system-overview');
  expect(overviewRes.status()).toBe(403);

  const settingsRes = await ctx.get('/api/admin/settings');
  expect(settingsRes.status()).toBe(403);
  await ctx.dispose();
});

test('USER 不能访问管理员客户列表与详情（应 403）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.user);
  expect(session?.user?.role).toBe('USER');

  const adminCustomersRes = await ctx.get('/api/admin/customers?page=1&pageSize=3');
  expect(adminCustomersRes.status()).toBe(403);

  const adminCustomerRes = await ctx.get('/api/admin/customers/1');
  expect(adminCustomerRes.status()).toBe(403);
  await ctx.dispose();
});
