import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { decryptIdCard } from '@/lib/encryption';
import { Role } from '@prisma/client';
import { successResponse, errorResponse } from '@/lib/api-response';

// 设置为动态路由
export const dynamic = 'force-dynamic';

// 检查用户是否为超级管理员
function isSuperAdmin(session: any) {
  return session?.user?.role === Role.SUPER_ADMIN;
}

/**
 * GET: 获取当前用户的个人资料
 */
export async function GET(request: Request) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    
    // 检查用户是否已授权
    if (!session?.user) {
      return errorResponse('未授权访问', 401);
    }
    
    // 根据用户ID获取完整的用户资料
    const user = await prisma.user.findUnique({
      where: { 
        id: session.user.id 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        // 公司基本信息
        companyName: true,
        phone: true,
        address: true,
        // 银行账户信息
        bankName: true,
        bankAccount: true,
        accountHolder: true,
        // 发票信息
        taxId: true,
        invoiceTitle: true,
        invoiceAddress: true,
        invoicePhone: true,
        // 身份证信息
        idCardNumberEncrypted: true,
        idCardType: true,
      }
    });
    
    if (!user) {
      return errorResponse('用户不存在', 404);
    }
    
    // 处理身份证号码解密（仅对超级管理员）
    let decryptedIdCardNumber = '';
    if (isSuperAdmin(session) && user.idCardNumberEncrypted) {
      try {
        console.log(`超级管理员请求用户ID:${user.id}的证件号码`);
        decryptedIdCardNumber = decryptIdCard(user.idCardNumberEncrypted);
        
        // 检查解密是否包含错误消息
        if (decryptedIdCardNumber.includes('解密失败') || 
            decryptedIdCardNumber.includes('格式错误') ||
            decryptedIdCardNumber.includes('无效')) {
          
          // 检查原始数据是否可能是明文证件号
          if (user.idCardNumberEncrypted && user.idCardNumberEncrypted.trim().length > 0) {
            console.log('原始数据可能是证件号码明文');
            decryptedIdCardNumber = user.idCardNumberEncrypted;
          }
        } else {
          console.log('成功解密证件号码');
        }
      } catch (error) {
        console.error("处理证件号码时发生错误:", error);
        decryptedIdCardNumber = '[处理异常] - 请重新设置';
      }
    }
    
    // 返回用户资料，包括解密后的证件号码（仅对超级管理员）
    return successResponse({
      ...user,
      decryptedIdCardNumber: isSuperAdmin(session) ? decryptedIdCardNumber : '',
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    return errorResponse('获取用户资料失败', 500);
  }
}

/**
 * PATCH: 更新当前用户的个人资料
 */
export async function PATCH(request: Request) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    
    // 检查用户是否已授权
    if (!session?.user) {
      return errorResponse('未授权访问', 401);
    }
    
    // 获取请求体数据
    const data = await request.json();
    
    // 构建更新数据对象，只包含有效字段
    const updateData: any = {};
    
    // 基本信息字段
    if (data.name !== undefined) updateData.name = data.name;
    
    // 公司基本信息字段
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    
    // 银行账户信息字段
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
    if (data.accountHolder !== undefined) updateData.accountHolder = data.accountHolder;
    
    // 发票信息字段
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.invoiceTitle !== undefined) updateData.invoiceTitle = data.invoiceTitle;
    if (data.invoiceAddress !== undefined) updateData.invoiceAddress = data.invoiceAddress;
    if (data.invoicePhone !== undefined) updateData.invoicePhone = data.invoicePhone;
    
    // 超级管理员可以更新证件号码
    if (isSuperAdmin(session) && data.idNumber) {
      try {
        // 获取证件类型
        const idCardType = data.idCardType || 'CHINA_MAINLAND';
        updateData.idCardType = idCardType;
        
        console.log(`超级管理员正在更新用户ID ${session.user.id} 的证件号码，类型: ${idCardType}`);
        
        // 导入加密模块
        const { encryptIdCard } = await import("@/lib/encryption");
        
        // 不再验证证件号码格式，只检查是否为空
        if (!data.idNumber.trim()) {
          return errorResponse('证件号码不能为空', 400);
        }
        
        // 加密证件号码
        updateData.idCardNumberEncrypted = encryptIdCard(data.idNumber, idCardType);
      } catch (error) {
        console.error('处理证件号码时出错:', error);
        return errorResponse('处理证件号码时出错', 500);
      }
    }
    
    // 如果没有有效的更新字段，返回错误
    if (Object.keys(updateData).length === 0) {
      return errorResponse('没有提供有效的更新字段', 400);
    }
    
    // 更新用户资料
    const updatedUser = await prisma.user.update({
      where: { 
        id: session.user.id 
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // 公司基本信息
        companyName: true,
        phone: true,
        address: true,
        // 银行账户信息
        bankName: true,
        bankAccount: true,
        accountHolder: true,
        // 发票信息
        taxId: true,
        invoiceTitle: true,
        invoiceAddress: true,
        invoicePhone: true,
        // 身份证信息
        idCardType: true,
      }
    });
    
    // 如果是超级管理员且更新了证件号码，尝试解密并返回
    let decryptedIdCardNumber = '';
    if (isSuperAdmin(session) && updateData.idCardNumberEncrypted) {
      try {
        decryptedIdCardNumber = decryptIdCard(updateData.idCardNumberEncrypted);
      } catch (error) {
        console.error('解密证件号码时出错:', error);
      }
    }
    
    // 返回更新后的用户资料
    return successResponse({
      ...updatedUser,
      decryptedIdCardNumber: isSuperAdmin(session) ? decryptedIdCardNumber : '',
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    return errorResponse('更新用户资料失败', 500);
  }
} 