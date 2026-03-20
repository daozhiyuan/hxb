import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const projectSchema = z.object({
  name: z.string().min(2, '项目名称至少 2 个字'),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse('未授权访问');
    if (!isAdmin(session)) return forbiddenResponse('禁止访问');

    const projects = await prisma.project.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        owner: { select: { id: true, name: true, email: true } },
        tasks: {
          orderBy: [{ updatedAt: 'desc' }],
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return successResponse(projects);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse('未授权访问');
    if (!isAdmin(session)) return forbiddenResponse('禁止访问');

    const parsed = projectSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.flatten());

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        ownerId: Number(session.user.id),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        tasks: true,
      },
    });

    return successResponse(project, 201);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
