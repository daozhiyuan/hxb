import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 获取客户详情
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('未授权', { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: parseInt(params.id),
      },
      include: {
        registeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        followUps: {
          select: {
            id: true,
            content: true,
            createdAt: true,
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
          take: 5,
        },
      },
    });

    if (!customer) {
      return new NextResponse('未找到客户', { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('获取客户详情失败:', error);
    return new NextResponse('获取客户详情失败', { status: 500 });
  }
}

// 更新客户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('未授权', { status: 401 });
    }

    const customerId = parseInt(params.id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '客户ID无效' }, { status: 400 });
    }

    // 获取现有客户
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    // 检查权限：只有管理员和客户创建者可以编辑
    if (
      session.user.role !== 'ADMIN' &&
      existingCustomer.registeredByPartnerId !== parseInt(session.user.id, 10)
    ) {
      return NextResponse.json({ error: '无权编辑此客户' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      companyName, 
      phone, 
      email, 
      status, 
      notes, 
      jobTitle, 
      address, 
      lastYearRevenue 
    } = body;

    // 字段验证
    if (!name) {
      return NextResponse.json({ error: '客户名称不能为空' }, { status: 400 });
    }

    // 更新客户信息
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name,
        companyName,
        phone,
        email,
        status,
        notes,
        jobTitle,
        address,
        lastYearRevenue: lastYearRevenue ? parseFloat(lastYearRevenue) : null,
      },
    });

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('更新客户信息失败:', error);
    return NextResponse.json({ error: '更新客户信息失败' }, { status: 500 });
  }
}

// 删除客户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('未授权', { status: 401 });
    }

    // 仅管理员可删除客户
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权删除客户' }, { status: 403 });
    }

    const customerId = parseInt(params.id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '客户ID无效' }, { status: 400 });
    }

    // 检查客户是否存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    // 先删除关联的跟进记录
    await prisma.followUp.deleteMany({
      where: { customerId },
    });

    // 删除客户
    await prisma.customer.delete({
      where: { id: customerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除客户失败:', error);
    return NextResponse.json({ error: '删除客户失败' }, { status: 500 });
  }
} 