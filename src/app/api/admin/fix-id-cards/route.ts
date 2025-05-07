import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isValidEncryptedFormat, reencryptData, hashIdCard } from "@/lib/encryption";

export const dynamic = 'force-dynamic';

/**
 * 修复身份证加密数据的API
 * 仅供超级管理员使用
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 权限检查
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    // 只允许超级管理员使用此功能
    if (String(session.user.role) !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '权限不足，只有超级管理员可以执行此操作' }, { status: 403 });
    }
    
    // 获取请求参数
    const { customerId } = await request.json();
    
    // 修复单个客户数据或所有客户数据
    if (customerId) {
      return await fixSingleCustomerIdCard(Number(customerId));
    } else {
      return await fixAllCustomersIdCards();
    }
  } catch (error) {
    console.error('修复身份证数据失败:', error);
    return NextResponse.json({ error: '修复失败，请查看服务器日志' }, { status: 500 });
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
        idCardNumberEncrypted: true
      }
    });
    
    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }
    
    // 如果没有身份证数据，返回状态
    if (!customer.idCardNumberEncrypted) {
      return NextResponse.json({
        message: '此客户没有身份证号码数据，无需修复',
        customer: { id: customer.id, name: customer.name }
      });
    }
    
    // 检查身份证加密格式是否有效
    if (isValidEncryptedFormat(customer.idCardNumberEncrypted)) {
      // 即使格式有效，也尝试解密验证数据的有效性
      try {
        const { decryptIdCard } = await import("@/lib/encryption");
        const decrypted = decryptIdCard(customer.idCardNumberEncrypted);
        
        // 如果解密过程没有抛出错误，但解密结果包含错误信息，仍需修复
        if (decrypted.includes('解密失败') || decrypted.includes('格式错误') || decrypted.includes('无效')) {
          console.log(`客户 ID ${customerId} 的数据格式正确但无法解密，将重置...`);
        } else {
          // 解密成功，无需修复
          return NextResponse.json({
            message: '此客户的身份证号码格式正确且可以解密，无需修复',
            customer: { id: customer.id, name: customer.name }
          });
        }
      } catch (error) {
        console.error(`客户 ID ${customerId} 的数据格式有效但解密失败:`, error);
        // 继续执行修复流程
      }
    }
    
    console.log(`尝试修复客户 ID ${customerId} 的身份证数据: ${customer.idCardNumberEncrypted}`);
    
    // 无论之前的尝试结果如何，对客户ID 21使用完全重置的逻辑
    if (customerId === 21) {
      console.log('特殊处理客户ID 21的身份证数据');
      const tempIdCard = "000000000000000000"; // 临时占位，必须手动更新
      
      // 使用完整路径导入加密函数
      const { encryptIdCard } = await import("@/lib/encryption");
      const encryptedTemp = encryptIdCard(tempIdCard);
      
      // 验证格式
      if (!isValidEncryptedFormat(encryptedTemp)) {
        console.error(`为客户ID ${customerId} 生成的加密数据格式无效`);
        return NextResponse.json({
          error: '生成的加密数据格式无效，请联系技术支持',
          customer: { id: customer.id, name: customer.name }
        }, { status: 500 });
      }
      
      // 更新数据库
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          idCardNumberEncrypted: encryptedTemp,
          idCardHash: null // 清空哈希，需要手动更新
        }
      });
      
      return NextResponse.json({
        message: '已为此客户重置身份证号码数据，请手动设置正确的身份证号码',
        customer: { id: customer.id, name: customer.name }
      });
    }
    
    // 尝试修复 - 这里假设未加密的内容可能就是身份证号码本身
    const reencryptedData = reencryptData(customer.idCardNumberEncrypted);
    if (!reencryptedData) {
      // 无法自动修复，设置临时占位数据
      console.log(`无法自动修复客户 ${customerId} 的数据，设置临时数据`);
      const tempIdCard = "000000000000000000"; // 临时占位，必须手动更新
      const encryptedTemp = await import("@/lib/encryption").then(
        ({ encryptIdCard }) => encryptIdCard(tempIdCard)
      );
      
      // 更新数据库
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          idCardNumberEncrypted: encryptedTemp,
          idCardHash: null // 清空哈希，需要手动更新
        }
      });
      
      return NextResponse.json({
        message: '无法自动修复，已重置身份证数据，请手动设置正确的身份证号码',
        customer: { id: customer.id, name: customer.name }
      });
    }
    
    // 检查原始数据是否可能是身份证号码本身
    const idCardPattern = /^\d{17}[\dX]$/i;
    const possibleIdNumber = customer.idCardNumberEncrypted;
    const updatedHash = idCardPattern.test(possibleIdNumber) 
      ? hashIdCard(possibleIdNumber) // 如果是身份证号码格式，用它生成哈希
      : null; // 否则不更新哈希，等待手动设置
    
    // 更新数据
    const updateData: any = {
      idCardNumberEncrypted: reencryptedData
    };
    
    // 只有当能生成有效哈希时才更新哈希
    if (updatedHash) {
      updateData.idCardHash = updatedHash;
    }
    
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      select: {
        id: true,
        name: true
      }
    });
    
    return NextResponse.json({
      message: updatedHash 
        ? '身份证号码数据和哈希均已修复成功' 
        : '身份证号码数据已修复，但哈希需要手动更新',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error(`修复客户 ID ${customerId} 的身份证数据失败:`, error);
    return NextResponse.json({
      error: '修复失败，请查看服务器日志',
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
        const tempIdCard = "000000000000000000"; // 临时占位，必须手动更新
        const encryptedTemp = await import("@/lib/encryption").then(
          ({ encryptIdCard }) => encryptIdCard(tempIdCard)
        );
        
        // 更新数据库
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idCardNumberEncrypted: encryptedTemp,
            idCardHash: null // 清空哈希，需要手动更新
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
        const tempIdCard = "000000000000000000"; // 临时占位，必须手动更新
        const encryptedTemp = await import("@/lib/encryption").then(
          ({ encryptIdCard }) => encryptIdCard(tempIdCard)
        );
        
        // 更新数据库
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idCardNumberEncrypted: encryptedTemp,
            idCardHash: null // 清空哈希，需要手动更新
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
        : null; // 否则不更新哈希
      
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