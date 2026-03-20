import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse('未授权访问');
    if (!isAdmin(session)) return forbiddenResponse('禁止访问');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [pendingAppeals, staleCustomers, overdueTasks, activeProjects] = await Promise.all([
      prisma.appeal.count({ where: { status: 'PENDING' } }),
      prisma.customer.count({ where: { OR: [{ lastContactDate: null }, { lastContactDate: { lt: sevenDaysAgo } }] } }),
      prisma.projectTask.count({ where: { dueDate: { lt: now }, status: { not: 'DONE' } } }),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
    ]);

    const suggestions = [
      pendingAppeals > 0
        ? {
            id: 'appeals-pending',
            level: 'high',
            title: '优先处理待办申诉',
            description: `当前仍有 ${pendingAppeals} 条待处理申诉，建议优先清理，避免合作方等待时间过长。`,
          }
        : null,
      staleCustomers > 0
        ? {
            id: 'customers-stale',
            level: 'medium',
            title: '补齐客户跟进节奏',
            description: `有 ${staleCustomers} 位客户最近 7 天未被有效跟进，建议安排回访或补录跟进记录。`,
          }
        : null,
      overdueTasks > 0
        ? {
            id: 'tasks-overdue',
            level: 'high',
            title: '处理逾期项目任务',
            description: `发现 ${overdueTasks} 条项目任务已逾期未完成，建议先处理阻塞任务。`,
          }
        : null,
      {
        id: 'projects-active',
        level: 'info',
        title: '项目管理概览',
        description: `当前共有 ${activeProjects} 个活跃项目，可继续用项目看板承接升级计划与功能拓展。`,
      },
    ].filter(Boolean);

    return successResponse({ suggestions });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
