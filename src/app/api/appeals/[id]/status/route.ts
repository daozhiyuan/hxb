import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus } from '@prisma/client';
import { sendEmail } from '@/lib/email';

// 状态更新请求的数据验证 Schema
const updateStatusSchema = z.object({
  status: z.nativeEnum(AppealStatus),
  remarks: z.string().min(1, { message: '处理备注不能为空' }).max(500),
});

// PATCH: 更新申诉状态
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    const appealId = parseInt(params.id, 10);
    if (isNaN(appealId)) {
      return NextResponse.json({ message: '无效的申诉ID' }, { status: 400 });
    }

    // 验证请求数据
    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: '请求数据无效', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { status: newStatus, remarks } = validation.data;

    // 获取当前申诉信息
    const currentAppeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        partner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!currentAppeal) {
      return NextResponse.json({ message: '申诉不存在' }, { status: 404 });
    }

    // 检查状态流转是否合法
    const isValidStatusTransition = checkStatusTransition(currentAppeal.status, newStatus);
    if (!isValidStatusTransition) {
      return NextResponse.json(
        { message: '非法的状态变更' },
        { status: 400 }
      );
    }

    // 更新申诉状态
    const updatedAppeal = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: newStatus,
        remarks,
        operatorId: parseInt(session.user.id, 10),
      },
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
      },
    });

    // 创建审计日志
    await prisma.appealLog.create({
      data: {
        appealId,
        action: 'STATUS_UPDATE',
        operatorId: parseInt(session.user.id, 10),
        remarks: `状态更新: ${currentAppeal.status} -> ${newStatus}, 备注: ${remarks}`,
      },
    });

    // 发送邮件通知
    if (currentAppeal.partner.email) {
      await sendEmail({
        to: currentAppeal.partner.email,
        subject: `申诉状态更新通知 - ${updatedAppeal.id}`,
        text: `尊敬的${currentAppeal.partner.name}：
        
您的申诉（编号：${updatedAppeal.id}）状态已更新为：${newStatus}
处理备注：${remarks}

如有疑问，请联系客服。`,
      });
    }

    return NextResponse.json(updatedAppeal);

  } catch (error) {
    console.error('更新申诉状态失败:', error);
    return NextResponse.json(
      { message: '更新申诉状态失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 检查状态流转是否合法
function checkStatusTransition(currentStatus: AppealStatus, newStatus: AppealStatus): boolean {
  const validTransitions = {
    [AppealStatus.PENDING]: [AppealStatus.PROCESSING, AppealStatus.APPROVED, AppealStatus.REJECTED],
    [AppealStatus.PROCESSING]: [AppealStatus.APPROVED, AppealStatus.REJECTED],
    [AppealStatus.APPROVED]: [],
    [AppealStatus.REJECTED]: [],
  };

  return validTransitions[currentStatus].includes(newStatus);
} 