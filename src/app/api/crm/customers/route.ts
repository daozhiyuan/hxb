import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSafeCustomersList } from '@/lib/prisma-helpers';
import { successResponse, errorResponse } from '@/lib/api-response';
import { isSuperAdmin } from '@/lib/auth-helpers';
import { decryptIdCard } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const statusFilter = searchParams.get('status') || '';

  try {
    const where: any = {};

    if (session.user.role === 'PARTNER') {
      where.registeredByPartnerId = Number(session.user.id);
    }

    if (searchQuery) {
      where.search = searchQuery;
    }

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    const result = await getSafeCustomersList({
      page,
      pageSize,
      where,
      sortBy,
      sortOrder,
    });

    if (isSuperAdmin(session) && Array.isArray(result.data)) {
      result.data = result.data.map((customer: any) => ({
        ...customer,
        decryptedIdCardNumber: customer.idNumber ? decryptIdCard(customer.idNumber) : '',
      }));
    }

    return successResponse(result);
  } catch (error) {
    console.error('获取客户列表失败:', error);
    return errorResponse('获取客户列表失败，请联系管理员');
  }
}
