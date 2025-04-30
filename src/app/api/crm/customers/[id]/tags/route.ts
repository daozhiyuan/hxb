import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

// 获取客户的所有标签
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const customerId = parseInt(params.id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { 
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        }
      },
    });

    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    return NextResponse.json(customer.tags);
  } catch (error) {
    console.error('获取客户标签失败:', error);
    return NextResponse.json({ error: '获取客户标签失败' }, { status: 500 });
  }
}

// 为客户添加标签
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const customerId = parseInt(params.id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json({ error: '标签ID为必填项' }, { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        tags: {
          connect: { id: tagId },
        },
      },
      include: { 
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        }
      },
    });

    return NextResponse.json(customer.tags);
  } catch (error) {
    console.error('添加客户标签失败:', error);
    return NextResponse.json({ error: '添加客户标签失败' }, { status: 500 });
  }
}