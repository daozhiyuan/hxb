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
      includeSensitiveIdData: isSuperAdmin(session),
    });

    if (Array.isArray(result.data)) {
      result.data = result.data.map((customer: any) => {
        const safeCustomer = {
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName ?? null,
          phone: customer.phone ?? null,
          email: customer.email ?? null,
          status: customer.status,
          notes: customer.notes ?? null,
          registrationDate: customer.registrationDate ?? customer.createdAt ?? null,
          updatedAt: customer.updatedAt ?? null,
          jobTitle: customer.jobTitle ?? null,
          createdAt: customer.createdAt ?? null,
          idCardType: customer.idCardType ?? null,
          industry: customer.industry ?? null,
          source: customer.source ?? null,
          address: customer.address ?? null,
          partnerId: customer.partnerId ?? null,
          lastContactDate: customer.lastContactDate ?? null,
        } as Record<string, any>;

        if (isSuperAdmin(session)) {
          safeCustomer.idNumberHash = customer.idNumberHash ?? null;
          safeCustomer.idNumber = customer.idNumber ?? '';
          safeCustomer.decryptedIdCardNumber = customer.idNumber ? decryptIdCard(customer.idNumber) : '';
        }

        return safeCustomer;
      });
    }

    return successResponse(result);
  } catch (error) {
    console.error('获取客户列表失败:', error);
    return errorResponse('获取客户列表失败，请联系管理员');
  }
}
