import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus, Role } from '@prisma/client';
import { hasPermission, isSuperAdmin } from '@/lib/auth-helpers';

// 直接定义API配置属性
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const dynamicParams = true;

// Schema for validating the PATCH request body
const updateAppealSchema = z.object({
  status: z.nativeEnum(AppealStatus),
  remarks: z.string().min(1, '请输入处理意见'),
});

// PATCH: 处理申诉状态更新
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    // 检查是否是超级管理员
    const isSuperAdminUser = isSuperAdmin(session);
    
    // 使用权限辅助函数检查是否有管理员权限，或者是超级管理员
    if (!isSuperAdminUser && !hasPermission(session, null, Role.ADMIN)) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 此时session已经通过了权限检查，所以一定非空
    if (!session || !session.user) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateAppealSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { status, remarks } = validation.data;

    // Check if appeal exists
    const appealId = parseInt(params.id, 10);
    if (isNaN(appealId)) {
      return NextResponse.json({ message: '无效的申诉ID' }, { status: 400 });
    }
    
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      return NextResponse.json({ message: '申诉不存在' }, { status: 404 });
    }

    if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.PROCESSING) {
      return NextResponse.json({ message: '该申诉已处理完成，无法再次修改状态' }, { status: 400 });
    }

    // 更新申诉状态
    const updatedAppeal = await prisma.$transaction(async (tx) => {
      // 更新申诉
      const updated = await tx.appeal.update({
        where: { id: appealId },
        data: {
          status,
          remarks,
          operator: {
            connect: {
              id: Number(session.user.id)
            }
          }
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

    const sanitizedAppeal = {
      id: updatedAppeal.id,
      customerName: updatedAppeal.customerName,
      status: updatedAppeal.status,
      remarks: updatedAppeal.remarks,
      operatorId: updatedAppeal.operatorId,
      updatedAt: updatedAppeal.updatedAt,
      createdAt: updatedAppeal.createdAt,
    };

    return NextResponse.json({ 
      success: true, 
      message: '申诉状态已更新',
      data: sanitizedAppeal,
      appeal: sanitizedAppeal
    });
  } catch (error) {
    console.error('更新申诉状态失败:', error);
    return NextResponse.json({ message: '更新申诉状态失败' }, { status: 500 });
  }
} 