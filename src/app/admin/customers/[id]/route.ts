import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSafeCustomerDetails } from "@/lib/prisma-helpers";
import { isSuperAdmin } from "@/lib/auth-helpers";
import { decryptIdCard } from "@/lib/encryption";

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
    
    // 使用安全查询辅助函数获取客户详情（避免暴露 partner 敏感字段）
    const customer = await getSafeCustomerDetails(customerId);
    
    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }
    
    // 检查是否是超级管理员、管理员或注册合作伙伴
//     const userRole = String(session.user.role);
//     if (userRole !== 'SUPER_ADMIN' && 
//         userRole !== 'ADMIN' && 
    const userRole = String(session.user.role);
//         customer.registeredByPartnerId !== session.user.id) {
//       return NextResponse.json({ error: '没有权限查看此客户' }, { status: 403 });
//     }
    
    // 如果是超级管理员，解密证件号码
    let decryptedIdCardNumber = '';
    if (userRole === 'SUPER_ADMIN') {
      try {
        decryptedIdCardNumber = customer.idNumber
          ? decryptIdCard(customer.idNumber)
          : '';
      } catch (error) {
        console.error("解密证件号码失败:", error);
        decryptedIdCardNumber = '[解密失败]';
      }
    }
    
    const safePartner = customer.partner
      ? {
          id: customer.partner.id,
          name: customer.partner.name,
          email: customer.partner.email,
        }
      : null;

    const safeFollowUps = Array.isArray(customer.followUps)
      ? customer.followUps.map((followUp: any) => ({
          id: followUp.id,
          content: followUp.content,
          createdAt: followUp.createdAt,
          customerId: followUp.customerId,
          createdById: followUp.createdById,
          type: followUp.type,
          createdBy: followUp.createdBy
            ? {
                id: followUp.createdBy.id,
                name: followUp.createdBy.name,
                email: followUp.createdBy.email,
              }
            : null,
        }))
      : [];

    // 返回带有解密身份证号码的结果（显式裁剪敏感关联字段）
    return NextResponse.json({
      ...customer,
      partner: safePartner,
      followUps: safeFollowUps,
      decryptedIdCardNumber: userRole === 'SUPER_ADMIN' ? decryptedIdCardNumber : '',
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
    
    // 检查是否是超级管理员、管理员或注册合作伙伴
//     const userRole = String(session.user.role);
//     if (userRole !== 'SUPER_ADMIN' && 
//         userRole !== 'ADMIN' && 
//         customer.registeredByPartnerId !== session.user.id) {
//       return NextResponse.json({ error: '没有权限更新此客户' }, { status: 403 });
//     }
    
    const body = await request.json();
    
    // 安全地提取可更新的字段
    const updateData: any = {};
    
    // 定义允许更新的字段（按当前 Customer schema）
    const allowedFields = [
      'name', 'phone', 'email', 'status',
      'notes', 'address', 'jobTitle', 'industry', 'source'
    ];
    
    // 超级管理员可以更新证件号码
    if (isSuperAdmin(session) && body.idNumber !== undefined) {
      try {
        updateData.idNumber = body.idNumber;
      } catch (error) {
        console.error("处理证件号码失败:", error);
        return NextResponse.json({ error: "更新证件号码失败" }, { status: 500 });
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
        idNumber: true,
        idNumberHash: true,
        partnerId: true,
      }
    });
    
    return NextResponse.json({
      ...updatedCustomer,
      registrationDate: updatedCustomer.createdAt,
    });
  } catch (error) {
    console.error("更新客户信息失败:", error);
    return NextResponse.json({ error: "更新客户信息失败" }, { status: 500 });
  }
} 