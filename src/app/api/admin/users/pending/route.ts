import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// 修改这一行
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // 验证管理员权限
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: '无权限执行此操作' },
        { status: 403 }
      );
    }

    // 获取所有未激活的用户
    const pendingUsers = await prisma.user.findMany({
      where: {
        isActive: false,
        role: 'PARTNER', // 只获取合作伙伴账号
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      users: pendingUsers,
    });
  } catch (error) {
    console.error('获取待审核用户列表失败:', error);
    return NextResponse.json(
      { message: '获取列表失败，请稍后重试' },
      { status: 500 }
    );
  }
}