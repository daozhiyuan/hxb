import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { safeCreateFollowUp } from '@/lib/prisma-helpers';
// 告诉 Next.js 这个路由是动态的
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: '缺少客户ID' }, { status: 400 });
    }

    const followUps = await prisma.followUp.findMany({
      where: {
        customerId: parseInt(customerId),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(followUps);
  } catch (error) {
    console.error('获取跟进记录失败:', error);
    return NextResponse.json({ error: '获取跟进记录失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, content, type } = body;

    if (!customerId || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 使用安全创建方法，处理类型转换和数据库兼容性问题
    const followUp = await safeCreateFollowUp({
      content,
      customerId: typeof customerId === 'string' ? parseInt(customerId, 10) : customerId,
      createdById: typeof session.user.id === 'string' ? parseInt(session.user.id, 10) : session.user.id,
      type: type || 'MEETING'
    });

    if (!followUp) {
      return NextResponse.json({ error: '创建跟进记录失败' }, { status: 500 });
    }

    return NextResponse.json(followUp);
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    return NextResponse.json({ error: '创建跟进记录失败' }, { status: 500 });
  }
}