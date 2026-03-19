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

test('ADMIN 可以访问管理员客户详情，但不应看到超级管理员敏感字段', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.admin);
  expect(session?.user?.role).toBe('ADMIN');

  const adminCustomerRes = await ctx.get('/api/admin/customers/1');
  expect(adminCustomerRes.status()).toBe(200);
  const body = await adminCustomerRes.json();
  expect(body?.id).toBe(1);
  expect(typeof body?.name).toBe('string');
  expect(body?.idNumber).toBeUndefined();
  expect(body?.decryptedIdCardNumber).toBe('');
  expect(body?.partner?.email).toBe('partner@example.com');
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

test('SUPER_ADMIN 也可以访问管理员客户列表（应 200）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.superadmin);
  expect(session?.user?.role).toBe('SUPER_ADMIN');

  const adminCustomersRes = await ctx.get('/api/admin/customers?page=1&pageSize=3');
  expect(adminCustomersRes.status()).toBe(200);
  const body = await adminCustomersRes.json();
  expect(Array.isArray(body?.data)).toBe(true);
  expect(body?.pagination?.page).toBe(1);
  await ctx.dispose();
});

test('SUPER_ADMIN 也可以访问管理员客户详情，并看到敏感字段', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.superadmin);
  expect(session?.user?.role).toBe('SUPER_ADMIN');

  const adminCustomerRes = await ctx.get('/api/admin/customers/1');
  expect(adminCustomerRes.status()).toBe(200);
  const body = await adminCustomerRes.json();
  expect(body?.id).toBe(1);
  expect(typeof body?.name).toBe('string');
  expect(typeof body?.idNumber).toBe('string');
  expect(body?.idNumber.length).toBeGreaterThan(0);
  expect(typeof body?.decryptedIdCardNumber).toBe('string');
  expect(body?.decryptedIdCardNumber.length).toBeGreaterThan(0);
  expect(body?.partner?.email).toBe('partner@example.com');
  await ctx.dispose();
});

test('ADMIN 与 SUPER_ADMIN 查看申诉详情时字段可见性不同', async ({ baseURL }) => {
  const adminCtx = await request.newContext({ baseURL });
  const adminSession = await loginByCredentials(adminCtx, roles.admin);
  expect(adminSession?.user?.role).toBe('ADMIN');

  const adminAppealRes = await adminCtx.get('/api/appeals/1');
  expect(adminAppealRes.status()).toBe(200);
  const adminBody = await adminAppealRes.json();
  expect(adminBody?.success).toBe(true);
  expect(adminBody?.data?.id).toBe(1);
  expect(adminBody?.data?.idNumber).toBeUndefined();
  expect(adminBody?.data?.idNumberHash).toBeUndefined();
  expect(adminBody?.data?.partner?.email).toBe('partner@example.com');

  const adminAppealsRes = await adminCtx.get('/api/appeals?status=PROCESSING&page=1&pageSize=10');
  expect(adminAppealsRes.status()).toBe(200);
  const adminListBody = await adminAppealsRes.json();
  expect(Array.isArray(adminListBody?.items)).toBe(true);
  expect(adminListBody?.pagination?.page).toBe(1);
  expect(adminListBody?.items?.length).toBeGreaterThan(0);
  expect(adminListBody.items[0]?.idNumber).toBeUndefined();
  expect(adminListBody.items[0]?.idNumberHash).toBeUndefined();
  expect(adminListBody.items[0]?.partner?.email).toBe('partner@example.com');
  await adminCtx.dispose();

  const superCtx = await request.newContext({ baseURL });
  const superSession = await loginByCredentials(superCtx, roles.superadmin);
  expect(superSession?.user?.role).toBe('SUPER_ADMIN');

  const superAppealRes = await superCtx.get('/api/appeals/1');
  expect(superAppealRes.status()).toBe(200);
  const superBody = await superAppealRes.json();
  expect(superBody?.success).toBe(true);
  expect(superBody?.data?.id).toBe(1);
  expect(typeof superBody?.data?.idNumber).toBe('string');
  expect(superBody?.data?.idNumber.length).toBeGreaterThan(0);
  expect(typeof superBody?.data?.idNumberHash).toBe('string');
  expect(superBody?.data?.idNumberHash.length).toBeGreaterThan(0);
  expect(superBody?.data?.partner?.email).toBe('partner@example.com');

  const superAppealsRes = await superCtx.get('/api/appeals?status=PROCESSING&page=1&pageSize=10');
  expect(superAppealsRes.status()).toBe(200);
  const superListBody = await superAppealsRes.json();
  expect(Array.isArray(superListBody?.items)).toBe(true);
  expect(superListBody?.pagination?.page).toBe(1);
  expect(superListBody?.items?.length).toBeGreaterThan(0);
  expect(typeof superListBody.items[0]?.idNumber).toBe('string');
  expect(superListBody.items[0]?.idNumber.length).toBeGreaterThan(0);
  expect(typeof superListBody.items[0]?.idNumberHash).toBe('string');
  expect(superListBody.items[0]?.idNumberHash.length).toBeGreaterThan(0);
  expect(superListBody.items[0]?.partner?.email).toBe('partner@example.com');
  await superCtx.dispose();
});

test('PARTNER 可访问申诉列表与自有申诉详情，但不能访问管理员能力接口', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.partner);
  expect(session?.user?.role).toBe('PARTNER');

  const appealsRes = await ctx.get('/api/appeals?status=PROCESSING&page=1&pageSize=10');
  expect(appealsRes.status()).toBe(200);
  const appealsBody = await appealsRes.json();
  expect(Array.isArray(appealsBody?.items)).toBe(true);
  expect(appealsBody?.items?.length).toBeGreaterThan(0);
  expect(appealsBody.items[0]?.idNumber).toBeUndefined();
  expect(appealsBody.items[0]?.idNumberHash).toBeUndefined();

  const appealDetailRes = await ctx.get('/api/appeals/1');
  expect(appealDetailRes.status()).toBe(200);
  const appealBody = await appealDetailRes.json();
  expect(appealBody?.success).toBe(true);
  expect(appealBody?.data?.id).toBe(1);
  expect(appealBody?.data?.idNumber).toBeUndefined();
  expect(appealBody?.data?.idNumberHash).toBeUndefined();

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

test('ADMIN 与 SUPER_ADMIN 导出处理中的申诉 CSV', async ({ baseURL }) => {
  const adminCtx = await request.newContext({ baseURL });
  const adminSession = await loginByCredentials(adminCtx, roles.admin);
  expect(adminSession?.user?.role).toBe('ADMIN');
  const adminExportRes = await adminCtx.get('/api/appeals/export?status=PROCESSING');
  expect(adminExportRes.status()).toBe(200);
  expect(adminExportRes.headers()['content-type']).toContain('text/csv');
  const adminCsv = await adminExportRes.text();
  expect(adminCsv).toContain('ID,客户姓名,申诉原因,状态');
  expect(adminCsv).toContain('Appeal Smoke Customer');
  await adminCtx.dispose();

  const superCtx = await request.newContext({ baseURL });
  const superSession = await loginByCredentials(superCtx, roles.superadmin);
  expect(superSession?.user?.role).toBe('SUPER_ADMIN');
  const superExportRes = await superCtx.get('/api/appeals/export?status=PROCESSING');
  expect(superExportRes.status()).toBe(200);
  expect(superExportRes.headers()['content-type']).toContain('text/csv');
  const superCsv = await superExportRes.text();
  expect(superCsv).toContain('ID,客户姓名,申诉原因,状态');
  expect(superCsv).toContain('Appeal Smoke Customer');
  await superCtx.dispose();
});

test('PARTNER 可以导出自己作用域内的处理中申诉 CSV', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.partner);
  expect(session?.user?.role).toBe('PARTNER');

  const exportRes = await ctx.get('/api/appeals/export?status=PROCESSING');
  expect(exportRes.status()).toBe(200);
  expect(exportRes.headers()['content-type']).toContain('text/csv');
  const csv = await exportRes.text();
  expect(csv).toContain('ID,客户姓名,申诉原因,状态');
  expect(csv).toContain('Appeal Smoke Customer');
  await ctx.dispose();
});

test('USER 只能导出空作用域的申诉 CSV', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.user);
  expect(session?.user?.role).toBe('USER');

  const exportRes = await ctx.get('/api/appeals/export?status=PROCESSING');
  expect(exportRes.status()).toBe(200);
  expect(exportRes.headers()['content-type']).toContain('text/csv');
  const csv = await exportRes.text();
  expect(csv).toContain('ID,客户姓名,申诉原因,状态');
  expect(csv).not.toContain('Appeal Smoke Customer');
  await ctx.dispose();
});
