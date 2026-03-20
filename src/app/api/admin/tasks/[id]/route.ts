import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, notFoundResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assigneeId: z.number().int().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse('未授权访问');
    if (!isAdmin(session)) return forbiddenResponse('禁止访问');

    const taskId = Number(params.id);
    const exists = await prisma.projectTask.findUnique({ where: { id: taskId } });
    if (!exists) return notFoundResponse('任务', taskId);

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.flatten());

    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return successResponse(task);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
