import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // 验证管理员权限
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: '无权限执行此操作' },
        { status: 403 }
      );
    }

    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { message: '无效的用户ID' },
        { status: 400 }
      );
    }

    // 获取请求体中的激活状态
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: '激活状态参数无效' },
        { status: 400 }
      );
    }

    // 更新用户状态
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: isActive ? '用户已激活' : '用户已禁用',
      user,
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    return NextResponse.json(
      { message: '操作失败，请稍后重试' },
      { status: 500 }
    );
  }
} 