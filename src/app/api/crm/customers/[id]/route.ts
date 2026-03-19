import { getServerSession } from 'next-auth';
import { Role } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getSafeCustomerDetails } from '@/lib/prisma-helpers';
import { decryptIdCard } from '@/lib/encryption';
import { hasPermission, isSuperAdmin } from '@/lib/auth-helpers';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const customerId = parseInt(params.id, 10);

    if (isNaN(customerId)) {
      return errorResponse('无效的客户ID', 400, 'INVALID_ID');
    }

    const customer = await getSafeCustomerDetails(customerId);
    if (!customer) {
      return notFoundResponse('客户', customerId);
    }

    if (!hasPermission(session, (customer as any).partnerId)) {
      return forbiddenResponse('没有权限查看此客户');
    }

    const responseData: any = { ...customer };

    if (isSuperAdmin(session) && (customer as any).idNumber) {
      responseData.idNumber = (customer as any).idNumber || '';
      try {
        responseData.decryptedIdCardNumber = decryptIdCard((customer as any).idNumber);
      } catch {
        responseData.decryptedIdCardNumber = '[解密失败]';
      }
    } else {
      delete responseData.idNumber;
      delete responseData.idNumberHash;
      delete responseData.decryptedIdCardNumber;
    }

    return successResponse(responseData);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const customerId = parseInt(params.id, 10);

    if (isNaN(customerId)) {
      return errorResponse('无效的客户ID', 400, 'INVALID_ID');
    }

    const customer = await getSafeCustomerDetails(customerId);
    if (!customer) {
      return notFoundResponse('客户', customerId);
    }

    if (!hasPermission(session, customer.partnerId)) {
      return forbiddenResponse('没有权限更新此客户');
    }

    const body = await request.json();
    const updateData: Record<string, any> = {};
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
      'lastContactDate',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (isSuperAdmin(session) && body.idNumber) {
      updateData.idNumber = body.idNumber;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        jobTitle: true,
        address: true,
        industry: true,
        source: true,
        idCardType: true,
        lastContactDate: true,
        partnerId: true,
        idNumber: true,
        idNumberHash: true,
      },
    });

    const responseData: Record<string, any> = { ...updatedCustomer };
    if (!isSuperAdmin(session)) {
      delete responseData.idNumber;
      delete responseData.idNumberHash;
    }

    return successResponse(responseData);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const customerId = parseInt(params.id, 10);

    if (isNaN(customerId)) {
      return errorResponse('无效的客户ID', 400, 'INVALID_ID');
    }

    const customer = await getSafeCustomerDetails(customerId);
    if (!customer) {
      return notFoundResponse('客户', customerId);
    }

    if (!hasPermission(session, null, [Role.ADMIN, Role.SUPER_ADMIN])) {
      return forbiddenResponse('没有权限删除此客户');
    }

    await prisma.followUp.deleteMany({ where: { customerId } });
    await prisma.customer.update({
      where: { id: customerId },
      data: { tags: { set: [] } },
    });
    await prisma.customer.delete({ where: { id: customerId } });

    return successResponse({ message: '客户已成功删除' });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
