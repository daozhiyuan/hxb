'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for validating the PATCH request body
const updatePartnerSchema = z.object({
  isActive: z.boolean(), // Expecting only the isActive status to be updated
});

// PATCH handler to update a specific partner's status
export async function PATCH(request: Request, { params }: { params: { partnerId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const partnerId = parseInt(params.partnerId, 10);

    // 1. Check Authentication and Authorization (ADMIN only)
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Validate partnerId
    if (isNaN(partnerId)) {
        return NextResponse.json({ message: '无效的合作伙伴 ID' }, { status: 400 });
    }

    // 3. Parse and Validate Request Body
    const body = await request.json();
    const validation = updatePartnerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { isActive } = validation.data;

    // 4. Ensure the user being updated is actually a partner
    const partnerToUpdate = await prisma.user.findUnique({
        where: { id: partnerId }
    });

    if (!partnerToUpdate) {
        return NextResponse.json({ message: '合作伙伴不存在' }, { status: 404 });
    }

    if (partnerToUpdate.role !== 'PARTNER') {
        return NextResponse.json({ message: '无法修改非合作伙伴用户的状态' }, { status: 400 });
    }
    
    // Prevent admin from disabling their own account via this route (though not expected)
    if (partnerToUpdate.id === parseInt(session.user.id, 10)) {
       return NextResponse.json({ message: '无法通过此接口修改自己的状态' }, { status: 400 });
    }

    // 5. Update the partner's isActive status
    const updatedPartner = await prisma.user.update({
      where: {
        id: partnerId,
        role: 'PARTNER', // Ensure we only update partners
      },
      data: {
        isActive: isActive,
      },
      select: { // Return updated fields
        id: true,
        isActive: true,
      }
    });

    // 6. Return Success Response
    return NextResponse.json(updatedPartner, { status: 200 });

  } catch (error) {
    console.error(`更新合作伙伴状态 API (Admin) 出错 (ID: ${params.partnerId}):`, error);
    // Handle potential Prisma errors, e.g., record not found during update
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
