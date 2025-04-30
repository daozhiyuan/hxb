import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tagId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const customerId = parseInt(params.id);
    const tagId = parseInt(params.tagId);

    if (isNaN(customerId) || isNaN(tagId)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        tags: {
          disconnect: { id: tagId },
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
    console.error('移除客户标签失败:', error);
    return NextResponse.json({ error: '移除客户标签失败' }, { status: 500 });
  }
}