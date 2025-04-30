'use server'; // Indicate this can run on the server

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// GET handler to fetch customers for the logged-in partner
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }
    const { role, id } = session.user;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (role === 'PARTNER') {
      where.registeredByPartnerId = parseInt(id, 10);
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { registrationDate: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    return NextResponse.json({
      data: customers,
      pagination: { page, pageSize, total }
    });
  } catch (error) {
    console.error('客户列表接口出错:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}

// Keep the POST handler from the previous step (register customer)
// If we put GET and POST in the same file, ensure imports and helper functions are shared correctly.
// For simplicity, let's assume register was in /api/customers/register/route.ts
// If you want GET and POST in the same /api/customers/route.ts, we'd need to merge.
// Let's keep them separate for now as originally planned.
// So this file is ONLY for GET /api/customers
