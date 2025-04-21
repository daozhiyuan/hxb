
'use server'; // Indicate this can run on the server

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// GET handler to fetch customers for the logged-in partner
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check Authentication and Authorization
    if (!session || !session.user || session.user.role !== 'PARTNER') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    const partnerId = parseInt(session.user.id, 10);

    // 2. Fetch customers registered by this partner
    const customers = await prisma.customer.findMany({
      where: {
        registeredByPartnerId: partnerId,
      },
      select: { // Select only the necessary fields for the list
        id: true,
        name: true,
        // idCardNumberEncrypted: false, // Do not send encrypted ID card in list view
        // idCardHash: false,          // Do not send hash in list view
        phone: true,
        address: true,
        status: true,
        notes: true,
        registrationDate: true,
        // createdAt: true, // Optional
        updatedAt: true,
        jobTitle: true, // Added jobTitle
      },
      orderBy: {
        registrationDate: 'desc', // Show newest first
      },
    });

    // 3. Return Success Response
    return NextResponse.json(customers, { status: 200 });

  } catch (error) {
    console.error('获取客户列表 API 出错:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}

// Keep the POST handler from the previous step (register customer)
// If we put GET and POST in the same file, ensure imports and helper functions are shared correctly.
// For simplicity, let's assume register was in /api/customers/register/route.ts
// If you want GET and POST in the same /api/customers/route.ts, we'd need to merge.
// Let's keep them separate for now as originally planned.
// So this file is ONLY for GET /api/customers
