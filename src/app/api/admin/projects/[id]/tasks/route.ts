import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, notFoundResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const taskSchema = z.object({
  title: z.string().min(2, '任务标题至少 2 个字'),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.number().int().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse('未授权访问');
    if (!isAdmin(session)) return forbiddenResponse('禁止访问');

    const projectId = Number(params.id);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFoundResponse('项目', projectId);

    const parsed = taskSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.flatten());

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        assigneeId: parsed.data.assigneeId ?? null,
        creatorId: Number(session!.user.id),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return successResponse(task, 201);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
