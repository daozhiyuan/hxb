import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
// 告诉 Next.js 这个路由是动态的
// 修改这一行
import { authOptions } from '@/lib/auth';
// 告诉 Next.js 这个路由是动态的

// 获取所有标签
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const tags = await prisma.customerTag.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('获取标签失败:', error);
    return NextResponse.json({ error: '获取标签失败' }, { status: 500 });
  }
}

// 创建新标签
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: '标签名称和颜色为必填项' },
        { status: 400 }
      );
    }

    const tag = await prisma.customerTag.create({
      data: {
        name,
        color,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('创建标签失败:', error);
    return NextResponse.json({ error: '创建标签失败' }, { status: 500 });
  }
}
