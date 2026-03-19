import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus, Role, Prisma } from '@prisma/client';
import { decryptIdCard, isValidEncryptedFormat } from '@/lib/encryption';
import { hasPermission, isAdmin, isSuperAdmin } from '@/lib/auth-helpers'; // 导入权限辅助函数
import { 
  successResponse, 
  unauthorizedResponse, 
  forbiddenResponse, 
  notFoundResponse, 
  validationErrorResponse,
  errorResponse,
  serverErrorResponse 
} from '@/lib/api-response';
import { updateAppealSchema } from '@/lib/validation-schemas';
import { IdCardType } from '@/lib/client-validation';

// 直接定义API配置属性
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const dynamicParams = true;

// 使用导入的Schema而不是重复定义
type UpdateAppealInput = z.infer<typeof updateAppealSchema>;

// GET: 获取申诉详情
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: parseInt(params.id, 10) },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        operator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        logs: {
          include: {
            operator: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!appeal) {
      return notFoundResponse('申诉', parseInt(params.id, 10));
    }

    const isPrivilegedAdmin = isAdmin(session) || isSuperAdmin(session);
    const isOwner = Number(appeal.partnerId) === Number(session.user.id);

    if (!isPrivilegedAdmin && !isOwner) {
      return forbiddenResponse('没有权限查看此申诉');
    }

    const responseData: Record<string, any> = { ...appeal };

    if (isSuperAdmin(session) && appeal.idNumber) {
      try {
        responseData.idNumber = decryptIdCard(appeal.idNumber);
      } catch (error) {
        console.error(`解密申诉证件号码失败 (申诉ID: ${appeal.id}):`, error);
        responseData.decryptionError = error instanceof Error ? error.message : '解密失败';
        responseData.idNumber = appeal.idNumber;
      }
    } else {
      delete responseData.idNumber;
      delete responseData.idNumberHash;
      delete responseData.decryptionError;
    }

    return successResponse(responseData);
  } catch (error) {
    console.error('获取申诉详情失败:', error);
    return serverErrorResponse(error);
  }
}

// PATCH: 处理申诉
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    // 使用权限辅助函数检查是否有权限更新申诉
    if (!hasPermission(session, null, Role.ADMIN)) {
      return forbiddenResponse('未授权操作');
    }

    // 此时session已经通过了hasPermission检查，所以一定非空
    if (!session || !session.user) {
      return unauthorizedResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateAppealSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
    }

    const { status, remarks } = validation.data;

    // Check if appeal exists
    const appealId = parseInt(params.id, 10);
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      return notFoundResponse('申诉', appealId);
    }

    if (appeal.status !== AppealStatus.PENDING) {
      return errorResponse('该申诉已处理', 400, 'APPEAL_ALREADY_PROCESSED');
    }

    // 更新申诉状态
    const updatedAppeal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 更新申诉
      const updated = await tx.appeal.update({
        where: { id: appealId },
        data: {
          status,
          remarks,
          operatorId: Number(session.user.id),
          // 记录处理时间
          adminComment: `处理时间: ${new Date().toISOString()}`
        },
      });

      // 创建操作日志
      await tx.appealLog.create({
        data: {
          appealId,
          action: 'STATUS_UPDATE',
          remarks: `状态更新: ${status} - ${remarks}`,
          operatorId: Number(session.user.id),
        },
      });

      return updated;
    });

    return successResponse({
      id: updatedAppeal.id,
      customerName: updatedAppeal.customerName,
      status: updatedAppeal.status,
      remarks: updatedAppeal.remarks,
      operatorId: updatedAppeal.operatorId,
      updatedAt: updatedAppeal.updatedAt,
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE: 删除申诉（仅限超级管理员）
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    // 检查是否为超级管理员
    if (!isSuperAdmin(session)) {
      return forbiddenResponse('只有超级管理员可以删除申诉记录');
    }

    // Validate and convert ID
    const appealId = parseInt(params.id, 10);
    if (isNaN(appealId)) {
      return errorResponse('无效的申诉 ID', 400, 'INVALID_ID');
    }

    // 检查申诉是否存在
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      return notFoundResponse('申诉', appealId);
    }

    // 使用事务删除申诉及相关日志
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 先删除申诉日志
      await tx.appealLog.deleteMany({
        where: { appealId },
      });

      // 再删除申诉记录
      await tx.appeal.delete({
        where: { id: appealId },
      });
    });

    return successResponse({ deleted: true, message: '申诉记录已删除' });
  } catch (error) {
    return serverErrorResponse(error);
  }
}