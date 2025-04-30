import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
// 修改这一行
import { authOptions } from '@/lib/authOptions';

// 获取客户所有跟进记录
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const customerId = Number(params.id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '客户ID无效' }, { status: 400 });
    }
    const followUps = await prisma.followUp.findMany({
      where: { customerId },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(followUps);
  } catch (error) {
    console.error('获取跟进记录失败:', error);
    return NextResponse.json({ error: '获取跟进记录失败' }, { status: 500 });
  }
}

// 新增跟进记录
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('未授权访问: 用户未登录');
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const customerId = parseInt(params.id);
    if (isNaN(customerId)) {
      console.error('无效的客户ID:', params.id);
      return NextResponse.json(
        { error: '无效的客户ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, type } = body;

    if (!content || !type) {
      console.error('缺少必要字段:', { content, type });
      return NextResponse.json(
        { error: '内容和类型为必填项' },
        { status: 400 }
      );
    }

    // 验证跟进类型
    const validTypes = ['MEETING', 'CALL', 'EMAIL', 'VISIT', 'OTHER'];
    if (!validTypes.includes(type)) {
      console.error('无效的跟进类型:', type);
      return NextResponse.json(
        { error: '无效的跟进类型' },
        { status: 400 }
      );
    }

    // 检查客户是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      console.error('客户不存在:', customerId);
      return NextResponse.json(
        { error: '客户不存在' },
        { status: 404 }
      );
    }

    console.log('创建跟进记录:', {
      customerId,
      content,
      type,
      createdById: session.user.id
    });

    const followUp = await prisma.followUp.create({
      data: {
        content,
        type,
        customerId,
        createdById: session.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log('跟进记录创建成功:', followUp);

    return NextResponse.json(followUp);
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    return NextResponse.json(
      { 
        error: '创建跟进记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}