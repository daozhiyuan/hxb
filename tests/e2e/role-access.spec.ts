import { test, expect, request, APIRequestContext } from '@playwright/test';
import { loginByCredentials, roles } from './auth-helpers';

async function fetchCsvWithRetry(ctx: APIRequestContext, path: string, attempts = 4) {
  let lastStatus = 0;
  let lastBody = '';

  for (let i = 0; i < attempts; i += 1) {
    const res = await ctx.get(path);
    lastStatus = res.status();
    const contentType = res.headers()['content-type'] || '';
    const body = await res.text();
    lastBody = body;

    if (lastStatus === 200 && contentType.includes('text/csv')) {
      return { status: lastStatus, contentType, body };
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  throw new Error(`CSV导出失败: status=${lastStatus}, body=${lastBody.slice(0, 120)}`);
}

test('匿名访问受保护 API 返回 401', async ({ request }) => {
  const res = await request.get('/api/crm/customers');
  expect(res.status()).toBe(401);
});

test('CRM 客户列表在 ADMIN / SUPER_ADMIN / PARTNER 间保持敏感字段可见性边界', async ({ baseURL }) => {
  const adminCtx = await request.newContext({ baseURL });
  await loginByCredentials(adminCtx, roles.admin);

  const adminRes = await adminCtx.get('/api/crm/customers?page=1&pageSize=3');
  expect(adminRes.status()).toBe(200);
  const adminBody = await adminRes.json();
  expect(Array.isArray(adminBody?.data?.data)).toBe(true);
  expect(adminBody?.data?.pagination?.page).toBe(1);
  expect(adminBody?.data?.data?.length).toBeGreaterThan(0);
  expect(typeof adminBody.data.data[0]?.id).toBe('number');
  expect(typeof adminBody.data.data[0]?.name).toBe('string');
  expect(typeof adminBody.data.data[0]?.status).toBe('string');
  expect(typeof adminBody.data.data[0]?.updatedAt).toBe('string');
  expect(adminBody.data.data[0]?.idNumber).toBeUndefined();
  expect(adminBody.data.data[0]?.idNumberHash).toBeUndefined();
  expect(adminBody.data.data[0]?.decryptedIdCardNumber).toBeUndefined();
  await adminCtx.dispose();

  const superCtx = await request.newContext({ baseURL });
  await loginByCredentials(superCtx, roles.superadmin);

  const superRes = await superCtx.get('/api/crm/customers?page=1&pageSize=3');
  expect(superRes.status()).toBe(200);
  const superBody = await superRes.json();
  expect(Array.isArray(superBody?.data?.data)).toBe(true);
  expect(superBody?.data?.pagination?.page).toBe(1);
  expect(superBody?.data?.data?.length).toBeGreaterThan(0);
  expect(typeof superBody.data.data[0]?.id).toBe('number');
  expect(typeof superBody.data.data[0]?.name).toBe('string');
  expect(typeof superBody.data.data[0]?.status).toBe('string');
  expect(typeof superBody.data.data[0]?.updatedAt).toBe('string');
  expect(typeof superBody.data.data[0]?.idNumber).toBe('string');
  expect(superBody.data.data[0]?.idNumber.length).toBeGreaterThan(0);
  expect(typeof superBody.data.data[0]?.idNumberHash).toBe('string');
  expect(superBody.data.data[0]?.idNumberHash.length).toBeGreaterThan(0);
  expect(typeof superBody.data.data[0]?.decryptedIdCardNumber).toBe('string');
  expect(superBody.data.data[0]?.decryptedIdCardNumber.length).toBeGreaterThan(0);
  await superCtx.dispose();

  const partnerCtx = await request.newContext({ baseURL });
  await loginByCredentials(partnerCtx, roles.partner);

  const partnerRes = await partnerCtx.get('/api/crm/customers?page=1&pageSize=10');
  expect(partnerRes.status()).toBe(200);
  const partnerBody = await partnerRes.json();
  expect(Array.isArray(partnerBody?.data?.data)).toBe(true);
  expect(partnerBody?.data?.pagination?.page).toBe(1);
  expect(partnerBody?.data?.data?.length).toBeGreaterThan(0);
  expect(partnerBody.data.data.every((item: any) => typeof item.partnerId === 'number')).toBe(true);
  expect(new Set(partnerBody.data.data.map((item: any) => item.partnerId)).size).toBe(1);
  expect(partnerBody.data.data[0]?.idNumber).toBeUndefined();
  expect(partnerBody.data.data[0]?.idNumberHash).toBeUndefined();
  expect(partnerBody.data.data[0]?.decryptedIdCardNumber).toBeUndefined();
  await partnerCtx.dispose();
});

test('CRM 客户详情在 ADMIN / SUPER_ADMIN / PARTNER 间保持敏感字段可见性边界', async ({ baseURL }) => {
  const adminCtx = await request.newContext({ baseURL });
  await loginByCredentials(adminCtx, roles.admin);

  const adminRes = await adminCtx.get('/api/crm/customers/1');
  expect(adminRes.status()).toBe(200);
  const adminBody = await adminRes.json();
  expect(adminBody?.success).toBe(true);
  expect(adminBody?.data?.id).toBe(1);
  expect(typeof adminBody?.data?.name).toBe('string');
  expect(adminBody?.data?.idNumber).toBeUndefined();
  expect(adminBody?.data?.idNumberHash).toBeUndefined();
  expect(adminBody?.data?.decryptedIdCardNumber).toBeUndefined();
  await adminCtx.dispose();

  const superCtx = await request.newContext({ baseURL });
  await loginByCredentials(superCtx, roles.superadmin);

  const superRes = await superCtx.get('/api/crm/customers/1');
  expect(superRes.status()).toBe(200);
  const superBody = await superRes.json();
  expect(superBody?.success).toBe(true);
  expect(superBody?.data?.id).toBe(1);
  expect(typeof superBody?.data?.name).toBe('string');
  expect(typeof superBody?.data?.idNumber).toBe('string');
  expect(superBody?.data?.idNumber.length).toBeGreaterThan(0);
  expect(typeof superBody?.data?.decryptedIdCardNumber).toBe('string');
  expect(superBody?.data?.decryptedIdCardNumber.length).toBeGreaterThan(0);
  await superCtx.dispose();

  const partnerCtx = await request.newContext({ baseURL });
  await loginByCredentials(partnerCtx, roles.partner);

  const partnerRes = await partnerCtx.get('/api/crm/customers/1');
  expect(partnerRes.status()).toBe(200);
  const partnerBody = await partnerRes.json();
  expect(partnerBody?.success).toBe(true);
  expect(partnerBody?.data?.id).toBe(1);
  expect(typeof partnerBody?.data?.name).toBe('string');
  expect(partnerBody?.data?.idNumber).toBeUndefined();
  expect(partnerBody?.data?.idNumberHash).toBeUndefined();
  expect(partnerBody?.data?.decryptedIdCardNumber).toBeUndefined();
  await partnerCtx.dispose();
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
  expect(typeof body?.runtime?.timestamp).toBe('string');
  expect(typeof body?.runtime?.nodeEnv).toBe('string');
  expect(typeof body?.runtime?.uptimeSeconds).toBe('number');
  expect(typeof body?.counts?.users).toBe('number');
  expect(typeof body?.counts?.customers).toBe('number');
  expect(typeof body?.counts?.appeals).toBe('number');
  expect(typeof body?.counts?.pendingAppeals).toBe('number');
  await ctx.dispose();
});

test('ADMIN 可以访问质量概览 API（应 200）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.admin);
  expect(session?.user?.role).toBe('ADMIN');

  const res = await ctx.get('/api/admin/quality-overview');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body?.status).toBe('OK');
  expect(typeof body?.generatedAt).toBe('string');
  expect(typeof body?.siteAuditCount).toBe('number');
  expect(Array.isArray(body?.suggestedCommands)).toBe(true);
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
  expect(body?.data?.length).toBeGreaterThan(0);
  expect(typeof body.data[0]?.id).toBe('number');
  expect(typeof body.data[0]?.name).toBe('string');
  expect(typeof body.data[0]?.status).toBe('string');
  expect(typeof body.data[0]?.partnerId).toBe('number');
  expect(typeof body.data[0]?.updatedAt).toBe('string');
  expect(body.data[0]?.partner?.email).toBe('partner@example.com');
  expect(body.data[0]?.partner?.passwordHash).toBeUndefined();
  expect(body.data[0]?.idNumber).toBeUndefined();
  expect(body.data[0]?.idNumberHash).toBeUndefined();
  expect(body.data[0]?.decryptedIdCardNumber).toBe('');
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
  expect(body?.idNumberHash).toBeUndefined();
  expect(body?.decryptedIdCardNumber).toBe('');
  expect(body?.partner?.email).toBe('partner@example.com');
  expect(body?.partner?.passwordHash).toBeUndefined();
  if (Array.isArray(body?.followUps) && body.followUps.length > 0) {
    expect(body.followUps[0]?.createdBy?.passwordHash).toBeUndefined();
    expect(typeof body.followUps[0]?.createdBy?.email).toBe('string');
  }
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
  expect(typeof body?.runtime?.timestamp).toBe('string');
  expect(typeof body?.runtime?.nodeEnv).toBe('string');
  expect(typeof body?.runtime?.uptimeSeconds).toBe('number');
  expect(typeof body?.counts?.users).toBe('number');
  expect(typeof body?.counts?.customers).toBe('number');
  expect(typeof body?.counts?.appeals).toBe('number');
  expect(typeof body?.counts?.pendingAppeals).toBe('number');
  await ctx.dispose();
});

test('SUPER_ADMIN 也可以访问质量概览 API（应 200）', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.superadmin);
  expect(session?.user?.role).toBe('SUPER_ADMIN');

  const res = await ctx.get('/api/admin/quality-overview');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body?.status).toBe('OK');
  expect(typeof body?.generatedAt).toBe('string');
  expect(typeof body?.siteAuditCount).toBe('number');
  expect(Array.isArray(body?.suggestedCommands)).toBe(true);
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
  expect(body?.data?.length).toBeGreaterThan(0);
  expect(typeof body.data[0]?.id).toBe('number');
  expect(typeof body.data[0]?.name).toBe('string');
  expect(typeof body.data[0]?.status).toBe('string');
  expect(typeof body.data[0]?.partnerId).toBe('number');
  expect(typeof body.data[0]?.updatedAt).toBe('string');
  expect(body.data[0]?.partner?.email).toBe('partner@example.com');
  expect(body.data[0]?.partner?.passwordHash).toBeUndefined();
  expect(typeof body.data[0]?.idNumber).toBe('string');
  expect(body.data[0]?.idNumber.length).toBeGreaterThan(0);
  expect(typeof body.data[0]?.idNumberHash).toBe('string');
  expect(body.data[0]?.idNumberHash.length).toBeGreaterThan(0);
  expect(typeof body.data[0]?.decryptedIdCardNumber).toBe('string');
  expect(body.data[0]?.decryptedIdCardNumber.length).toBeGreaterThan(0);
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
  expect(typeof body?.idNumberHash).toBe('string');
  expect(body?.idNumberHash.length).toBeGreaterThan(0);
  expect(typeof body?.decryptedIdCardNumber).toBe('string');
  expect(body?.decryptedIdCardNumber.length).toBeGreaterThan(0);
  expect(body?.partner?.email).toBe('partner@example.com');
  expect(body?.partner?.passwordHash).toBeUndefined();
  if (Array.isArray(body?.followUps) && body.followUps.length > 0) {
    expect(body.followUps[0]?.createdBy?.passwordHash).toBeUndefined();
    expect(typeof body.followUps[0]?.createdBy?.email).toBe('string');
  }
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
  expect(adminBody?.data?.partner?.passwordHash).toBeUndefined();
  expect(adminBody?.data?.operator?.passwordHash).toBeUndefined();

  const adminAppealsRes = await adminCtx.get('/api/appeals?status=PROCESSING&page=1&pageSize=10');
  expect(adminAppealsRes.status()).toBe(200);
  const adminListBody = await adminAppealsRes.json();
  expect(Array.isArray(adminListBody?.items)).toBe(true);
  expect(adminListBody?.pagination?.page).toBe(1);
  expect(adminListBody?.items?.length).toBeGreaterThan(0);
  expect(adminListBody.items[0]?.idNumber).toBeUndefined();
  expect(adminListBody.items[0]?.idNumberHash).toBeUndefined();
  expect(adminListBody.items[0]?.partner?.email).toBe('partner@example.com');
  expect(adminListBody.items[0]?.partner?.passwordHash).toBeUndefined();
  expect(adminListBody.items[0]?.operator?.passwordHash).toBeUndefined();
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
  expect(superBody?.data?.partner?.passwordHash).toBeUndefined();
  expect(superBody?.data?.operator?.passwordHash).toBeUndefined();

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
  expect(superListBody.items[0]?.partner?.passwordHash).toBeUndefined();
  expect(superListBody.items[0]?.operator?.passwordHash).toBeUndefined();
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
  expect(appealsBody.items[0]?.partner?.passwordHash).toBeUndefined();
  expect(appealsBody.items[0]?.operator?.passwordHash).toBeUndefined();

  const appealDetailRes = await ctx.get('/api/appeals/1');
  expect(appealDetailRes.status()).toBe(200);
  const appealBody = await appealDetailRes.json();
  expect(appealBody?.success).toBe(true);
  expect(appealBody?.data?.id).toBe(1);
  expect(appealBody?.data?.idNumber).toBeUndefined();
  expect(appealBody?.data?.idNumberHash).toBeUndefined();
  expect(appealBody?.data?.partner?.passwordHash).toBeUndefined();
  expect(appealBody?.data?.operator?.passwordHash).toBeUndefined();

  const adminCustomersRes = await ctx.get('/api/admin/customers?page=1&pageSize=3');
  expect(adminCustomersRes.status()).toBe(403);

  const adminCustomerRes = await ctx.get('/api/admin/customers/1');
  expect(adminCustomerRes.status()).toBe(403);

  const overviewRes = await ctx.get('/api/admin/system-overview');
  expect(overviewRes.status()).toBe(403);

  const qualityRes = await ctx.get('/api/admin/quality-overview');
  expect(qualityRes.status()).toBe(403);

  const settingsRes = await ctx.get('/api/admin/settings');
  expect(settingsRes.status()).toBe(403);
  await ctx.dispose();
});

test('ADMIN 与 SUPER_ADMIN 导出处理中的申诉 CSV', async ({ baseURL }) => {
  test.setTimeout(120_000);

  const adminCtx = await request.newContext({ baseURL });
  const adminSession = await loginByCredentials(adminCtx, roles.admin);
  expect(adminSession?.user?.role).toBe('ADMIN');
  const adminCsvRes = await fetchCsvWithRetry(adminCtx, '/api/appeals/export?status=PROCESSING');
  expect(adminCsvRes.status).toBe(200);
  expect(adminCsvRes.contentType).toContain('text/csv');
  expect(adminCsvRes.body).toContain('ID,客户姓名,申诉原因,状态');
  expect(adminCsvRes.body).toContain('Appeal Smoke Customer');
  await adminCtx.dispose();

  const superCtx = await request.newContext({ baseURL });
  const superSession = await loginByCredentials(superCtx, roles.superadmin);
  expect(superSession?.user?.role).toBe('SUPER_ADMIN');
  const superCsvRes = await fetchCsvWithRetry(superCtx, '/api/appeals/export?status=PROCESSING');
  expect(superCsvRes.status).toBe(200);
  expect(superCsvRes.contentType).toContain('text/csv');
  expect(superCsvRes.body).toContain('ID,客户姓名,申诉原因,状态');
  expect(superCsvRes.body).toContain('Appeal Smoke Customer');
  await superCtx.dispose();
});

test('PARTNER 可以导出自己作用域内的处理中申诉 CSV', async ({ baseURL }) => {
  test.setTimeout(120_000);

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

test('USER 不能访问管理员能力，但可以导出空作用域的申诉 CSV', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.user);
  expect(session?.user?.role).toBe('USER');

  const overviewRes = await ctx.get('/api/admin/system-overview');
  expect(overviewRes.status()).toBe(403);

  const qualityRes = await ctx.get('/api/admin/quality-overview');
  expect(qualityRes.status()).toBe(403);

  const settingsRes = await ctx.get('/api/admin/settings');
  expect(settingsRes.status()).toBe(403);

  const adminCustomersRes = await ctx.get('/api/admin/customers?page=1&pageSize=3');
  expect(adminCustomersRes.status()).toBe(403);

  const adminCustomerRes = await ctx.get('/api/admin/customers/1');
  expect(adminCustomerRes.status()).toBe(403);

  const appealDetailRes = await ctx.get('/api/appeals/1');
  expect(appealDetailRes.status()).toBe(403);

  const exportRes = await ctx.get('/api/appeals/export?status=PROCESSING');
  expect(exportRes.status()).toBe(200);
  expect(exportRes.headers()['content-type']).toContain('text/csv');
  const csv = await exportRes.text();
  expect(csv).toContain('ID,客户姓名,申诉原因,状态');
  expect(csv).not.toContain('Appeal Smoke Customer');
  await ctx.dispose();
});

test('ADMIN 可以创建项目、创建任务并更新状态', async ({ baseURL }) => {
  test.setTimeout(120_000);

  const ctx = await request.newContext({ baseURL });
  const session = await loginByCredentials(ctx, roles.admin);
  expect(session?.user?.role).toBe('ADMIN');

  const projectName = `E2E项目-${Date.now()}`;
  const createProjectRes = await ctx.post('/api/admin/projects', {
    data: { name: projectName, description: '项目管理最小可用版回归', priority: 'MEDIUM' },
  });
  expect(createProjectRes.status()).toBe(201);
  const projectBody = await createProjectRes.json();
  const projectId = projectBody?.data?.id;
  expect(typeof projectId).toBe('number');

  const createTaskRes = await ctx.post(`/api/admin/projects/${projectId}/tasks`, {
    data: { title: '补齐最小任务流', priority: 'HIGH' },
  });
  expect(createTaskRes.status()).toBe(201);
  const taskBody = await createTaskRes.json();
  const taskId = taskBody?.data?.id;
  expect(typeof taskId).toBe('number');

  const patchTaskRes = await ctx.patch(`/api/admin/tasks/${taskId}`, {
    data: { status: 'IN_PROGRESS' },
  });
  expect(patchTaskRes.status()).toBe(200);
  const patchedTaskBody = await patchTaskRes.json();
  expect(patchedTaskBody?.data?.status).toBe('IN_PROGRESS');

  const listProjectsRes = await ctx.get('/api/admin/projects');
  expect(listProjectsRes.status()).toBe(200);
  const listProjectsBody = await listProjectsRes.json();
  const created = listProjectsBody?.data?.find((item: any) => item.id === projectId);
  expect(created?.name).toBe(projectName);
  expect(Array.isArray(created?.tasks)).toBe(true);
  expect(created?.tasks?.some((task: any) => task.id === taskId && task.status === 'IN_PROGRESS')).toBe(true);
  await ctx.dispose();
});

test('ADMIN 可以获取智能助手建议，PARTNER 无权访问', async ({ baseURL }) => {
  const adminCtx = await request.newContext({ baseURL });
  const adminSession = await loginByCredentials(adminCtx, roles.admin);
  expect(adminSession?.user?.role).toBe('ADMIN');
  const adminRes = await adminCtx.get('/api/admin/assistant-suggestions');
  expect(adminRes.status()).toBe(200);
  const adminBody = await adminRes.json();
  expect(Array.isArray(adminBody?.data?.suggestions)).toBe(true);
  expect(adminBody?.data?.suggestions?.length).toBeGreaterThan(0);
  await adminCtx.dispose();

  const partnerCtx = await request.newContext({ baseURL });
  const partnerSession = await loginByCredentials(partnerCtx, roles.partner);
  expect(partnerSession?.user?.role).toBe('PARTNER');
  const partnerRes = await partnerCtx.get('/api/admin/assistant-suggestions');
  expect(partnerRes.status()).toBe(403);
  await partnerCtx.dispose();
});
