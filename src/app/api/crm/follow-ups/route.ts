import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

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
    const { customerId, content } = body;

    if (!customerId || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const followUp = await prisma.followUp.create({
      data: {
        content,
        customerId: parseInt(customerId),
        createdById: session.user.id,
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
    });

    return NextResponse.json(followUp);
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    return NextResponse.json({ error: '创建跟进记录失败' }, { status: 500 });
  }
}