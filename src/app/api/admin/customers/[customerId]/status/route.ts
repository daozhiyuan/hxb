'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Define allowed statuses
const allowedStatuses = ['submitted', 'processing', 'approved', 'rejected'] as const;

// Schema for validating the PATCH request body
const updateStatusSchema = z.object({
  status: z.enum(allowedStatuses, { 
      errorMap: () => ({ message: '无效的状态值' }) 
  }),
});

// PATCH handler to update a specific customer's status
export async function PATCH(request: Request, { params }: { params: { customerId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const customerId = parseInt(params.customerId, 10);

    // 1. Check Authentication and Authorization (ADMIN only)
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Validate customerId
    if (isNaN(customerId)) {
        return NextResponse.json({ message: '无效的客户 ID' }, { status: 400 });
    }

    // 3. Parse and Validate Request Body
    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { status: newStatus } = validation.data;

    // 4. Update the customer's status
    // Optional: Check if customer exists before updating? Prisma update throws error if not found.
    const updatedCustomer = await prisma.customer.update({
      where: {
        id: customerId,
      },
      data: {
        status: newStatus,
        // Optionally update updatedAt timestamp automatically (Prisma handles this)
      },
      select: { // Return updated fields
        id: true,
        status: true,
        updatedAt: true,
      }
    });

    // 5. Return Success Response
    return NextResponse.json(updatedCustomer, { status: 200 });

  } catch (error: any) {
    console.error(`更新客户状态 API (Admin) 出错 (ID: ${params.customerId}):`, error);
    // Handle potential Prisma errors, e.g., record not found during update (P2025)
    if (error.code === 'P2025') { 
         return NextResponse.json({ message: '客户记录不存在' }, { status: 404 });
    }
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
