import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { reencryptData } from "@/lib/encryption";
import { Role } from '@prisma/client';
import { isSuperAdmin } from '@/lib/auth-helpers';
import { 
  successResponse, 
  unauthorizedResponse, 
  forbiddenResponse, 
  serverErrorResponse 
} from '@/lib/api-response';
import { Prisma } from "@prisma/client";
import { IdCardType } from "@/lib/client-validation";

// 使用自定义导入允许我们以非严格模式使用解密函数
const { encryptIdCard, validateIdCard, decryptIdCard, isValidEncryptedFormat, hashIdCard } =
  require("@/lib/encryption");

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 修复身份证数据的API
 * 支持多种修复操作: 
 * 1. 修复idCardType (将NULL和空值设为默认值)
 * 2. 修复idCardNumberEncrypted (重新加密/解密/格式修正)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 权限检查
    if (!session) {
      return unauthorizedResponse();
    }
    
    if (!isSuperAdmin(session)) {
      return forbiddenResponse('仅超级管理员可执行此操作');
    }
    
    // 获取请求参数，决定执行哪种修复
    const body = await request.json().catch(() => ({}));
    const { operation = 'fix_id_cards', customerId } = body;
    
    // 根据操作类型执行不同的修复
    switch (operation) {
      case 'fix_id_card_type':
        return await fixIdCardType();
        
      case 'fix_id_cards':
    if (customerId) {
      return await fixSingleCustomerIdCard(Number(customerId));
    } else {
      return await fixAllCustomersIdCards();
    }
        
      default:
        return errorResponse('未知的修复操作', 400);
    }
  } catch (error) {
    console.error('修复操作失败:', error);
    return serverErrorResponse(error);
  }
}

/**
 * 修复idCardType字段为NULL或空的记录
 */
async function fixIdCardType() {
  try {
    // 开始修复数据
    console.log('开始修复历史数据中的证件类型...');
    
    // 修复customers表
    const customersResult = await prisma.$executeRaw`
      UPDATE customers 
      SET idCardType = 'CHINA_MAINLAND' 
      WHERE idCardType IS NULL OR idCardType = ''
    `;
    
    // 修复Appeal表
    const appealsResult = await prisma.$executeRaw`
      UPDATE Appeal 
      SET idCardType = 'CHINA_MAINLAND' 
      WHERE idCardType IS NULL OR idCardType = ''
    `;
    
    console.log(`成功修复 ${customersResult} 条客户数据`);
    console.log(`成功修复 ${appealsResult} 条申诉数据`);
    
    return successResponse({
      success: true,
      customersFixed: Number(customersResult),
      appealsFixed: Number(appealsResult),
      totalFixed: Number(customersResult) + Number(appealsResult),
      message: '历史数据证件类型修复完成'
    });
  } catch (error) {
    console.error('修复历史数据证件类型失败:', error);
    return serverErrorResponse(error);
  }
}

/**
 * 修复单个客户的身份证数据
 */
async function fixSingleCustomerIdCard(customerId: number) {
  try {
    // 检查客户是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
        idCardHash: true
      }
    });
    
    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }
    
    // 获取证件类型，默认为中国大陆身份证
    let idCardType = IdCardType.CHINA_MAINLAND;
    try {
      // @ts-ignore - 忽略TypeScript错误，因为prisma类型定义可能尚未更新
      if (customer && customer.idCardType && typeof customer.idCardType === 'string') {
        // @ts-ignore
        idCardType = customer.idCardType as IdCardType;
      }
    } catch (e) {
      console.warn(`获取证件类型失败，使用默认值:`, e);
    }
    
    let result = {
      message: "",
      before: "",
      after: "",
      status: "unchanged",
    };
    
    // 如果没有加密的证件号码，返回错误
    if (!customer.idCardNumberEncrypted) {
      return NextResponse.json({
        message: "客户没有证件号码数据",
        status: "failed",
      });
    }
    
    // 记录原始值
    result.before = customer.idCardNumberEncrypted;
    
    try {
      // 尝试解密证件号码（不验证格式）
      const decrypted = decryptIdCard(customer.idCardNumberEncrypted);
    
      // 检查解密结果
      if (decrypted.includes('解密失败') || 
          decrypted.includes('格式错误') || 
          decrypted.includes('无效') ||
          decrypted.includes('异常')) {
        // 解密失败，尝试设置临时数据
        const tempIdNumber = `110101199001010000${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        // 加密临时数据
        const encryptedTemp = encryptIdCard(tempIdNumber, idCardType);
        const hashTemp = hashIdCard(tempIdNumber, idCardType);
      
        // 更新数据库
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idCardNumberEncrypted: encryptedTemp,
            idCardHash: hashTemp,
            idCardType: idCardType
          },
        });
        
        result.message = "解密失败，已设置临时数据。请在管理界面重新设置正确的证件号码。";
        result.after = tempIdNumber;
        result.status = "temporary_fix";
        
        return NextResponse.json(result);
      }
      
      // 解密成功，但检查是否需要重新加密（统一格式和支持证件类型）
      // 不再进行格式验证，只检查是否是加密格式
      if (!isValidEncryptedFormat(customer.idCardNumberEncrypted) || 
          customer.idCardNumberEncrypted === decrypted) {
        // 重新加密（允许任何证件格式）
        try {
          const newEncrypted = encryptIdCard(decrypted, idCardType);
          const newHash = hashIdCard(decrypted, idCardType);
      
      // 更新数据库
          await prisma.customer.update({
            where: { id: customer.id },
        data: {
              idCardNumberEncrypted: newEncrypted,
              idCardHash: newHash,
              idCardType: idCardType
            },
          });
          
          result.message = "成功重新加密证件号码";
          result.after = newEncrypted;
          result.status = "reencrypted";
          
        } catch (encryptError) {
          console.error("重新加密失败:", encryptError);
          result.message = "重新加密失败: " + 
            (encryptError instanceof Error ? encryptError.message : "未知错误");
          result.status = "encrypt_failed";
        }
      } else {
        // 已经是有效的加密格式，不需要改变
        result.message = "证件号码格式正确，无需修复";
        result.after = customer.idCardNumberEncrypted;
        result.status = "already_valid";
      }
      
      return NextResponse.json(result);
      
    } catch (error) {
      console.error("修复证件号码时出错:", error);
      return NextResponse.json({
        message: "处理出错: " + (error instanceof Error ? error.message : "未知错误"),
        status: "error",
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`修复客户ID ${customerId} 的身份证数据失败:`, error);
    return NextResponse.json({
      error: '修复失败，请查看服务器日志',
      details: error instanceof Error ? error.message : '未知错误',
      customerId
    }, { status: 500 });
  }
}

/**
 * 修复所有客户的身份证数据
 */
async function fixAllCustomersIdCards() {
  try {
    // 获取所有有身份证号码的客户
    const customers = await prisma.customer.findMany({
      where: {
        idCardNumberEncrypted: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true
      }
    });
    
    const results = {
      total: customers.length,
      fixed: 0,
      fixedWithHash: 0,
      resetToTemp: 0,
      alreadyValid: 0,
      unfixable: 0,
      details: [] as Array<{
        id: number;
        name: string;
        status: 'fixed' | 'fixed_with_hash' | 'already_valid' | 'unfixable' | 'reset_to_temp';
      }>
    };
    
    // 处理每个客户
    for (const customer of customers) {
      if (!customer.idCardNumberEncrypted) continue;
      
      // 检查是否已经是有效格式
      if (isValidEncryptedFormat(customer.idCardNumberEncrypted)) {
        results.alreadyValid++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'already_valid'
        });
        continue;
      }
      
      console.log(`尝试修复客户 ID ${customer.id} 的身份证数据: ${customer.idCardNumberEncrypted}`);
      
      // 特别处理客户ID为21的情况
      if (customer.id === 21) {
        // 为客户ID 21设置一个临时的有效身份证号码，需要之后手动更新
        console.log('特殊处理客户ID 21的身份证数据');
        const tempIdCard = "110101199001011234"; // 有效格式的临时身份证号码
        const encryptedTemp = await import("@/lib/encryption").then(
          ({ encryptIdCard }) => encryptIdCard(tempIdCard)
        );
        
        // 更新数据库
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idCardNumberEncrypted: encryptedTemp,
            idCardHash: hashIdCard(tempIdCard) // 使用临时身份证号码生成哈希
          }
        });
        
        results.resetToTemp++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'reset_to_temp'
        });
        continue;
      }
      
      // 尝试修复
      const reencryptedData = reencryptData(customer.idCardNumberEncrypted);
      if (!reencryptedData) {
        // 尝试处理无法修复的数据，设置临时数据
        const tempIdCard = "110101199001011234"; // 有效格式的临时身份证号码
        const encryptedTemp = await import("@/lib/encryption").then(
          ({ encryptIdCard }) => encryptIdCard(tempIdCard)
        );
        
        // 更新数据库
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idCardNumberEncrypted: encryptedTemp,
            idCardHash: hashIdCard(tempIdCard) // 使用临时身份证号码生成哈希
          }
        });
        
        results.resetToTemp++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'reset_to_temp'
        });
        continue;
      }
      
      // 检查原始数据是否可能是身份证号码本身
      const idCardPattern = /^\d{17}[\dX]$/i;
      const possibleIdNumber = customer.idCardNumberEncrypted;
      const updatedHash = idCardPattern.test(possibleIdNumber) 
        ? hashIdCard(possibleIdNumber) // 如果是身份证号码格式，用它生成哈希
        : null; // 否则不更新哈希，等待手动设置
      
      // 准备更新数据
      const updateData: any = {
        idCardNumberEncrypted: reencryptedData
      };
      
      // 只有当能生成有效哈希时才更新哈希
      if (updatedHash) {
        updateData.idCardHash = updatedHash;
      }
      
      // 更新数据
      await prisma.customer.update({
        where: { id: customer.id },
        data: updateData
      });
      
      // 记录结果
      if (updatedHash) {
        results.fixedWithHash++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'fixed_with_hash'
        });
      } else {
        results.fixed++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'fixed'
        });
      }
    }
    
    return NextResponse.json({
      message: '批量修复身份证号码数据完成',
      results
    });
  } catch (error) {
    console.error('批量修复身份证数据失败:', error);
    return NextResponse.json({
      error: '批量修复失败，请查看服务器日志'
    }, { status: 500 });
  }
}

// 辅助函数：错误响应
function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
} 