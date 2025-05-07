import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus, Role } from '@prisma/client';
import { decryptIdCard } from '@/lib/encryption'; // 导入解密函数
import { hasPermission, isAdmin } from '@/lib/auth-helpers'; // 导入权限辅助函数

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

type UpdateAppealInput = z.infer<typeof updateAppealSchema>;

// GET: 获取申诉详情
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // Validate and convert ID
    const appealId = parseInt(params.id, 10);
    if (isNaN(appealId)) {
      return NextResponse.json({ message: '无效的申诉 ID' }, { status: 400 });
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
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
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            operator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!appeal) {
      return NextResponse.json({ message: '申诉不存在' }, { status: 404 });
    }

    // 使用权限辅助函数检查访问权限
    if (!hasPermission(session, appeal.partnerId)) {
      return NextResponse.json({ message: '无权访问此申诉' }, { status: 403 });
    }

    // 解析额外信息
    let extraInfo = null;
    if (appeal.remarks) {
      try {
        extraInfo = JSON.parse(appeal.remarks);
      } catch (e) {
        // 如果解析失败，使用原始remarks
        console.log('无法解析remarks为JSON');
      }
    }

    // 在返回前解密身份证号
    const decryptedAppeal = {
      ...appeal,
      idNumber: appeal.idNumber ? decryptIdCard(appeal.idNumber) : '',
      extraInfo: extraInfo,
    };

    return NextResponse.json(decryptedAppeal);

  } catch (error) {
    console.error('获取申诉详情失败:', error);
    return NextResponse.json({ message: '获取申诉详情失败' }, { status: 500 });
  }
}

// PATCH: 处理申诉
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    // 使用权限辅助函数检查是否有权限更新申诉
    if (!hasPermission(session, null, Role.ADMIN)) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 此时session已经通过了hasPermission检查，所以一定非空
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
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      return NextResponse.json({ message: '申诉不存在' }, { status: 404 });
    }

    if (appeal.status !== AppealStatus.PENDING) {
      return NextResponse.json({ message: '该申诉已处理' }, { status: 400 });
    }

    // 更新申诉状态
    const updatedAppeal = await prisma.$transaction(async (tx) => {
      // 更新申诉
      const updated = await tx.appeal.update({
        where: { id: appealId },
        data: {
          status,
          remarks,
          operatorId: Number(session.user.id),
          processedAt: new Date(),
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

    return NextResponse.json(updatedAppeal);
  } catch (error) {
    console.error('处理申诉失败:', error);
    return NextResponse.json({ message: '处理申诉失败' }, { status: 500 });
  }
}