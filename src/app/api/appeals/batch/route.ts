import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus, Role, Prisma } from '@prisma/client';
import { hasPermission } from '@/lib/auth-helpers';

// 导入API配置
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// 验证请求体
const batchUpdateSchema = z.object({
  appealIds: z.array(z.number()),
  status: z.nativeEnum(AppealStatus),
  remarks: z.string().min(1, '请输入处理意见'),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 使用权限辅助函数检查是否有管理员权限
    if (!hasPermission(session, null, Role.ADMIN)) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 此时session已经通过了hasPermission检查，所以一定非空
    if (!session || !session.user) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 解析和验证请求体
    const body = await request.json();
    const validation = batchUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: '请求数据无效', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { appealIds, status, remarks } = validation.data;

    // 检查所有申诉是否存在且状态正确
    const appeals = await prisma.appeal.findMany({
      where: {
        id: { in: appealIds },
        status: {
          in: [AppealStatus.PENDING, AppealStatus.PROCESSING],
        },
      },
    });

    if (appeals.length !== appealIds.length) {
      return NextResponse.json(
        { message: '部分申诉不存在或状态不允许更新' },
        { status: 400 }
      );
    }

    // 批量更新申诉状态
    const updatedAppeals = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updates = await tx.appeal.updateMany({
        where: {
          id: { in: appealIds },
        },
        data: {
          status,
          remarks,
          operatorId: Number(session.user.id),
        },
      });

      // 创建日志记录
      const logs = appealIds.map(appealId => ({
        appealId,
        action: 'BATCH_UPDATE',
        operatorId: Number(session.user.id),
        remarks: `批量更新状态: ${status} - ${remarks}`,
      }));

      await tx.appealLog.createMany({
        data: logs,
      });

      return updates;
    });

    return NextResponse.json({ 
      success: true, 
      message: `成功更新 ${updatedAppeals.count} 条申诉`, 
      count: updatedAppeals.count 
    });
  } catch (error) {
    console.error('批量处理申诉失败:', error);
    return NextResponse.json({ message: '批量处理申诉失败' }, { status: 500 });
  }
} 