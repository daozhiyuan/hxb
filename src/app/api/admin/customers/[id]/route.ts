import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSafeCustomerDetails } from "@/lib/prisma-helpers";
import { decryptIdCard, isValidEncryptedFormat } from "@/lib/encryption";
import { Role } from "@prisma/client";
import { hasPermission, isAdmin, isSuperAdmin } from "@/lib/auth-helpers";
import { IdCardType } from "@/lib/client-validation";

// 导入validateIdCard函数
// 在服务器端，使用简单的验证，只检查非空
function validateIdCard(card: string, idCardType: string = 'CHINA_MAINLAND'): boolean {
  if (!card) return false;
  return card.trim().length > 0;
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 修复：确保id为数字类型
    const customerId = parseInt(params.id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        partner: true,
        followUps: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        tags: true
      }
    });

    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    // 如果是超级管理员，解密身份证号码
    let decryptedIdCardNumber = '';
    if (isSuperAdmin(session)) {
      try {
        decryptedIdCardNumber = customer.idNumber 
          ? decryptIdCard(customer.idNumber) 
          : '';
      } catch (error) {
        console.error("解密身份证号码失败:", error);
        decryptedIdCardNumber = '[解密失败]';
      }
    }
    // 始终返回加密字段
    return NextResponse.json({
      ...customer,
      idNumber: customer.idNumber || '',
      decryptedIdCardNumber: isSuperAdmin(session) ? decryptedIdCardNumber : '',
    });
  } catch (error) {
    // 增加详细错误日志
    console.error('获取客户详情失败:', error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: '获取客户详情失败' },
      { status: 500 }
    );
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
    if (!hasPermission(session, customer.partner?.id, [Role.ADMIN, Role.SUPER_ADMIN])) {
      return NextResponse.json({ error: '没有权限更新此客户' }, { status: 403 });
    }
    
    const body = await request.json();
    
    // 安全地提取可更新的字段
    const updateData: any = {};
    
    // 定义允许更新的字段
    const allowedFields = [
      'name', 'phone', 'email', 'status', 
      'notes', 'address', 'jobTitle'
    ];
    
    // 超级管理员可以更新证件号码
    if (isSuperAdmin(session) && body.idNumber) {
      try {
        // 获取证件类型
        const idCardType = body.idCardType || IdCardType.CHINA_MAINLAND;
        updateData.idCardType = idCardType;
        
        console.log(`超级管理员正在更新客户ID ${customerId} 的证件号码，类型: ${idCardType}`);
        
        // 如果已经是加密格式，不需要重新加密
        if (body.idNumber.includes(':') && isValidEncryptedFormat(body.idNumber)) {
          console.log(`输入的证件号码是已加密格式，直接使用`);
          updateData.idCardNumberEncrypted = body.idNumber;
        }
        // 否则对证件号码进行加密
        else {
          console.log(`输入的证件号码是明文格式，准备加密`);
          
          // 导入加密模块和验证函数
          const { encryptIdCard, hashIdCard } = await import("@/lib/encryption");
          
          // 不再验证证件号码格式，只检查是否为空
          if (!body.idNumber.trim()) {
            return NextResponse.json({ error: '证件号码不能为空' }, { status: 400 });
          }
          
          try {
            // 规范化证件号码
            const normalizedIdNumber = body.idNumber.trim().toUpperCase();
            
            // 加密证件号码
            updateData.idCardNumberEncrypted = encryptIdCard(normalizedIdNumber);
            
            // 验证加密结果是否有效
            if (!isValidEncryptedFormat(updateData.idCardNumberEncrypted)) {
              throw new Error("生成的加密数据格式无效");
            }
          
          // 同时更新哈希值用于查询
            updateData.idCardHash = hashIdCard(normalizedIdNumber, idCardType);
          
            console.log(`证件号码加密成功`);
          } catch (encryptError) {
            console.error("加密证件号码失败:", encryptError);
            return NextResponse.json({ 
              error: "加密证件号码失败，请稍后重试",
              details: encryptError instanceof Error ? encryptError.message : "未知错误"
            }, { status: 500 });
          }
        }
      } catch (error) {
        console.error("处理证件号码失败:", error);
        return NextResponse.json({ 
          error: "更新证件号码失败，请检查格式",
          details: error instanceof Error ? error.message : "未知错误"
        }, { status: 500 });
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
        address: true,
        jobTitle: true,
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