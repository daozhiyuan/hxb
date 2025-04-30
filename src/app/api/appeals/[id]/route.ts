import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

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

    const appealId = parseInt(params.id, 10);
    if (isNaN(appealId)) {
      return NextResponse.json({ message: '无效的申诉ID' }, { status: 400 });
    }

    // 构建查询条件
    const where = {
      id: appealId,
      ...(session.user.role !== 'ADMIN'
        ? { partnerId: parseInt(session.user.id, 10) }
        : {}),
    };

    // 获取申诉详情
    const appeal = await prisma.appeal.findFirst({
      where,
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
      return NextResponse.json(
        { message: '申诉不存在或无权访问' },
        { status: 404 }
      );
    }

    return NextResponse.json(appeal);
  } catch (error) {
    console.error('获取申诉详情失败:', error);
    return NextResponse.json(
      { message: '获取申诉详情失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 