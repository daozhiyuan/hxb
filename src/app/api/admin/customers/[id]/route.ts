import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSafeCustomerDetails } from "@/lib/prisma-helpers";
import { decryptIdCard } from "@/lib/encryption";
import { Role } from "@prisma/client";
import { hasPermission, isAdmin, isSuperAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  
  try {
    const customerId = parseInt(params.id);
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }
    
    // 使用安全查询辅助函数获取客户详情
    const customer = await getSafeCustomerDetails(customerId);
    
    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }
    
    // 使用权限辅助函数检查访问权限 - 只有管理员或超级管理员可访问
    if (!hasPermission(session, customer.registeredByPartnerId, [Role.ADMIN, Role.SUPER_ADMIN])) {
      return NextResponse.json({ error: '没有权限查看此客户' }, { status: 403 });
    }
    
    // 如果是超级管理员，解密身份证号码
    let decryptedIdCardNumber = '';
    if (isSuperAdmin(session)) {
      try {
        decryptedIdCardNumber = customer.idCardNumberEncrypted 
          ? decryptIdCard(customer.idCardNumberEncrypted) 
          : '';
      } catch (error) {
        console.error("解密身份证号码失败:", error);
        decryptedIdCardNumber = '[解密失败]';
      }
    }
    
    // 返回带有解密身份证号码的结果
    return NextResponse.json({
      ...customer,
      decryptedIdCardNumber: isSuperAdmin(session) ? decryptedIdCardNumber : '',
    });
  } catch (error) {
    console.error("获取客户详情失败:", error);
    return NextResponse.json({ error: "获取客户详情失败" }, { status: 500 });
  }
}

/**
 * 处理客户信息更新
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  
  try {
    const customerId = parseInt(params.id);
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }
    
    // 获取客户详情以检查权限
    const customer = await getSafeCustomerDetails(customerId);
    
    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }
    
    // 使用权限辅助函数检查访问权限 - 只有管理员或超级管理员可访问
    if (!hasPermission(session, customer.registeredByPartnerId, [Role.ADMIN, Role.SUPER_ADMIN])) {
      return NextResponse.json({ error: '没有权限更新此客户' }, { status: 403 });
    }
    
    const body = await request.json();
    
    // 安全地提取可更新的字段
    const updateData: any = {};
    
    // 定义允许更新的字段
    const allowedFields = [
      'name', 'companyName', 'phone', 'email', 'status', 
      'notes', 'address', 'jobTitle', 'lastYearRevenue'
    ];
    
    // 超级管理员可以更新身份证号码
    if (isSuperAdmin(session) && body.idNumber) {
      try {
        // 存储加密的身份证号码
        updateData.idCardNumberEncrypted = body.idNumber;
      } catch (error) {
        console.error("处理身份证号码失败:", error);
        return NextResponse.json({ error: "更新身份证号码失败" }, { status: 500 });
      }
    }
    
    // 只更新请求中包含的允许字段
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });
    
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
        address: true,
        jobTitle: true,
        lastYearRevenue: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json({
      ...updatedCustomer,
      message: '客户信息已更新'
    });
  } catch (error) {
    console.error("更新客户信息失败:", error);
    return NextResponse.json({ error: "更新客户信息失败" }, { status: 500 });
  }
} 