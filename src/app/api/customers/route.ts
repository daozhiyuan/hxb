import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { customerSchema } from '@/models/customer';
import { hashIdCard, encryptIdCard } from '@/lib/encryption';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';

    const where = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN'
      ? { name: { contains: search } }
      : {
          AND: [
            { partnerId: Number(session.user.id) },
            { name: { contains: search } },
          ],
        };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取客户列表失败:', error);
    return NextResponse.json({ error: '获取客户列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = customerSchema.parse(body);
    const partnerId = Number(validatedData.partnerId || session.user.id);

    const hashedId = hashIdCard(validatedData.idNumber);
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        partnerId,
        idNumberHash: hashedId,
      },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: '该身份证号码已被报备，如有异议请提交申诉' },
        { status: 409 }
      );
    }

    const encryptedId = encryptIdCard(validatedData.idNumber);
    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
        idNumber: encryptedId,
        idNumberHash: hashedId,
        idCardType: 'CHINA_MAINLAND',
        phone: validatedData.phone,
        address: validatedData.address,
        partnerId,
        status: 'active',
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('创建客户失败:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: '输入数据验证失败', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: '创建客户失败' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const customerId = Number(body.id);

    if (!customerId) {
      return NextResponse.json({ error: '客户ID不能为空' }, { status: 400 });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'SUPER_ADMIN' &&
      existingCustomer.partnerId !== Number(session.user.id)
    ) {
      return NextResponse.json({ error: '没有权限更新此客户' }, { status: 403 });
    }

    const allowedFields = [
      'name',
      'phone',
      'email',
      'status',
      'notes',
      'address',
      'jobTitle',
      'industry',
      'source',
      'idCardType',
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    return NextResponse.json(updatedCustomer);
  } catch (error: any) {
    console.error('更新客户失败:', error);
    return NextResponse.json({ error: '更新客户失败' }, { status: 500 });
  }
}
