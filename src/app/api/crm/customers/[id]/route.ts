import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSafeCustomerDetails } from "@/lib/prisma-helpers";
import { decryptIdCard } from "@/lib/encryption";
import { Role } from "@prisma/client";
import { hasPermission, isAdmin, isSuperAdmin } from "@/lib/auth-helpers";
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse, 
  notFoundResponse, 
  serverErrorResponse 
} from "@/lib/api-response";

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
    const customerId = parseInt(params.id);
    
    if (isNaN(customerId)) {
      return errorResponse('无效的客户ID', 400, 'INVALID_ID');
    }
    
    // 使用安全查询辅助函数获取客户详情
    const customer = await getSafeCustomerDetails(customerId);
    
    if (!customer) {
      return notFoundResponse('客户', customerId);
    }
    
    // 使用权限辅助函数检查访问权限
    if (!hasPermission(session, (customer as any).partnerId)) {
      return forbiddenResponse('没有权限查看此客户');
    }
    
    // 解密身份证号码（如果是超级管理员）
    let decryptedData = { ...customer };
    // 始终返回加密字段
    decryptedData.idNumber = (customer as any).idNumber || '';
    if (isSuperAdmin(session) && (customer as any).idNumber) {
      try {
        const decryptedResult = decryptIdCard((customer as any).idNumber);
        if (decryptedResult.startsWith('解密失败') || 
            decryptedResult.startsWith('格式错误') ||
            decryptedResult === '加密密钥未初始化') {
          (decryptedData as any).decryptedIdCardNumber = '[解密失败]';
        } else {
          (decryptedData as any).decryptedIdCardNumber = decryptedResult;
        }
      } catch (error) {
        (decryptedData as any).decryptedIdCardNumber = '[解密失败]';
      }
    }
    return successResponse(decryptedData);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

/**
 * 更新客户信息
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return unauthorizedResponse();
  }
  
  try {
    const customerId = parseInt(params.id);
    
    if (isNaN(customerId)) {
      return errorResponse('无效的客户ID', 400, 'INVALID_ID');
    }
    
    // 获取客户详情以检查权限
    const customer = await getSafeCustomerDetails(customerId);
    
    if (!customer) {
      return notFoundResponse('客户', customerId);
    }
    
    // 使用权限辅助函数检查访问权限
    if (!hasPermission(session, customer.partnerId)) {
      return forbiddenResponse('没有权限更新此客户');
    }
    
    const body = await request.json();
    
    // 安全地提取可更新的字段
    const updateData: any = {};
    
    // 定义允许更新的字段
    const allowedFields = [
      'name', 'companyName', 'phone', 'email', 'status', 
      'notes', 'address', 'jobTitle', 'industry', 'source',
      'followUpStatus', 'priority', 'lastYearRevenue', 'idCardType'
    ];
    
    // 只更新请求中包含的允许字段
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });
    
    // 超级管理员可以更新身份证号码
    if (isSuperAdmin(session) && body.idNumber) {
      try {
        updateData.idNumber = body.idNumber;
      } catch (error) {
        return errorResponse('身份证号码加密失败', 422, 'ENCRYPTION_ERROR');
      }
    }
    
    // 更新客户信息
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      select: {
        id: true,
        name: true,
        companyName: true,
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
        followUpStatus: true,
        priority: true,
        lastYearRevenue: true
      }
    });
    
    return successResponse(updatedCustomer);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

/**
 * 删除客户
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return unauthorizedResponse();
  }
  
  try {
    const customerId = parseInt(params.id);
    
    if (isNaN(customerId)) {
      return errorResponse('无效的客户ID', 400, 'INVALID_ID');
    }
    
    // 获取客户详情以检查权限
    const customer = await getSafeCustomerDetails(customerId);
    
    if (!customer) {
      return notFoundResponse('客户', customerId);
    }
    
    // 使用权限辅助函数检查访问权限 - 只有管理员和超级管理员可以删除客户
    if (!hasPermission(session, null, [Role.ADMIN, Role.SUPER_ADMIN])) {
      return forbiddenResponse('没有权限删除此客户');
    }
    
    // 删除与客户相关的所有跟进记录
    await prisma.followUp.deleteMany({
      where: { customerId }
    });
    
    // 删除客户与标签的关联
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        tags: {
          set: []
        }
      }
    });
    
    // 删除客户
    await prisma.customer.delete({
      where: { id: customerId }
    });
    
    return successResponse({ message: '客户已成功删除' });
  } catch (error) {
    return serverErrorResponse(error);
  }
} 