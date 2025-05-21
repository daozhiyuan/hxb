import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { z } from 'zod';

// 告诉 Next.js 这个路由是动态的
export const dynamic = 'force-dynamic';

// 验证请求体
const activateSchema = z.object({
  isActive: z.boolean(),
});

// PATCH: 激活/禁用用户
export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('开始处理用户激活/禁用请求...');
    
    const session = await getServerSession(authOptions);
    console.log('当前会话:', session?.user?.email, '角色:', session?.user?.role);
    
    // 检查是否是管理员或超级管理员
    if (!session?.user || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPER_ADMIN)) {
      console.log('权限检查失败: 非管理员或超级管理员用户');
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 解析和验证请求体
    const body = await request.json();
    console.log('请求体:', body);
    
    const validation = activateSchema.safeParse(body);

    if (!validation.success) {
      console.log('请求数据验证失败:', validation.error.format());
      return NextResponse.json(
        { message: '请求数据无效', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { isActive } = validation.data;
    const userId = parseInt(params.userId, 10);

    if (isNaN(userId)) {
      console.log('无效的用户ID:', params.userId);
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 });
    }

    // 检查用户是否存在
    console.log('查询用户信息...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('用户不存在:', userId);
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    // 更新用户状态
    console.log(`更新用户 ${userId} 状态为 ${isActive ? '激活' : '禁用'}...`);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    console.log('用户状态更新成功:', updatedUser);
    return NextResponse.json({
      message: `用户已${isActive ? '激活' : '禁用'}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    return NextResponse.json({ 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 