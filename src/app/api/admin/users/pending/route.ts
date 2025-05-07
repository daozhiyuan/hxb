import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

// 告诉 Next.js 这个路由是动态的
export const dynamic = 'force-dynamic';

// GET: 获取待审核用户列表
export async function GET(request: Request) {
  try {
    console.log('开始获取待审核用户列表...');
    
    const session = await getServerSession(authOptions);
    console.log('当前会话:', session?.user?.email, '角色:', session?.user?.role);
    
    // 检查是否是管理员
    if (!session?.user || session.user.role !== Role.ADMIN) {
      console.log('权限检查失败: 非管理员用户');
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 获取所有未激活的合作伙伴用户
    console.log('查询数据库获取待审核用户...');
    const pendingUsers = await prisma.user.findMany({
      where: {
        role: Role.PARTNER,
        isActive: false,
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
    
    console.log(`成功获取到 ${pendingUsers.length} 个待审核用户`);
    return NextResponse.json({ users: pendingUsers });
  } catch (error) {
    console.error('获取待审核用户列表失败:', error);
    return NextResponse.json({ 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 