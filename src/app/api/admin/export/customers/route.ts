'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/db'; // 使用新的prisma客户端
import crypto from 'crypto';

// --- Encryption/Decryption Settings (Must match the encryption logic) ---
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_DERIVATION_ITERATIONS = 100000;

// --- Helper Function to get Encryption Key (Must match the encryption logic) ---
const getEncryptionKey = () => {
  const secret = process.env.ID_CARD_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ID_CARD_ENCRYPTION_SECRET is not set in environment variables.');
  }
  const salt = Buffer.alloc(SALT_LENGTH, 'fixed-salt-for-pbkdf2'); // Use the same salt as encryption
  return crypto.pbkdf2Sync(secret, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha512');
};

// --- Helper Function for Decryption ---
const decryptIdCard = (encryptedIdCard: string, userRole: string): string | null => {
  try {
    // 检查是否是简化格式的加密字符串
    if (encryptedIdCard.startsWith('encrypted_id_')) {
      // 从简化格式中提取身份证号码的最后三位
      const lastThreeDigits = encryptedIdCard.substring('encrypted_id_'.length);
      
      // 对于超级管理员，返回完整身份证号（实际应用中应从安全存储恢复）
      if (userRole === 'SUPERADMIN') {
        return `HIDDEN-SUPERADMIN-ONLY-${lastThreeDigits}`;
      }
      
      // 对于普通管理员，返回带掩码的身份证号
      if (userRole === 'ADMIN') {
        return `***************${lastThreeDigits}`;
      }
      
      // 对于其他角色，最小化信息暴露
      return `***************${lastThreeDigits}`;
    }
    
    // 处理标准加密格式数据
    if (userRole === 'SUPERADMIN') {
      try {
        // 尝试真实解密 - 仅对SUPERADMIN
        const data = Buffer.from(encryptedIdCard, 'base64');
        const iv = data.subarray(0, IV_LENGTH);
        const tag = data.subarray(data.length - TAG_LENGTH);
        const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);
        
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
      } catch (decryptError) {
        console.error('解密失败:', decryptError);
        return '[SUPERADMIN解密失败]';
      }
    } else {
      // 非SUPERADMIN用户看到遮蔽的信息
      return '****************';
    }
  } catch (error) {
    console.error('解密身份证号码失败:', error);
    return null;
  }
};

// --- Helper Function to escape CSV fields ---
const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    // If the field contains a comma, double quote, or newline, enclose it in double quotes
    // Also, escape existing double quotes by doubling them
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

// --- API Handler for Export ---
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. 检查权限（仅限管理员和超级管理员）
    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. 获取所有客户和合作伙伴信息
    const customers = await prisma.customer.findMany({
      include: {
        registeredBy: { // 包括相关合作伙伴信息
          select: {
            name: true,
            email: true,
          }
        },
      },
      orderBy: {
        registrationDate: 'asc', // 按注册日期排序以保持一致性
      },
    });

    // 3. 准备CSV数据
    const headers = [
      'ID', 
      '客户姓名',
      '单位名称',
      '去年营收',
      '身份证号码', 
      '联系电话', 
      '联系地址', 
      '职位',
      '状态', 
      '备注', 
      '报备人姓名', 
      '报备人邮箱', 
      '报备日期',
      '最后更新日期'
    ];
    
    const rows = customers.map(customer => {
        const decryptedIdCard = decryptIdCard(customer.idCardNumberEncrypted, session.user.role);
        return [
            customer.id,
            customer.name,
            customer.companyName || '',
            customer.lastYearRevenue || '',
            decryptedIdCard || '[解密失败]', // 显示解密的身份证或错误占位符
            customer.phone || '',
            customer.address || '',
            customer.jobTitle || '',
            customer.status,
            customer.notes || '',
            customer.registeredBy?.name || '',
            customer.registeredBy?.email || '',
            customer.registrationDate ? new Date(customer.registrationDate).toLocaleDateString('zh-CN') : '',
            customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('zh-CN') : ''
        ].map(escapeCsvField); // 转义每个字段
    });

    // 结合标题和行到CSV字符串
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // 4. 设置CSV下载的响应头
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    // 添加BOM以兼容Excel的UTF-8
    const BOM = '\uFEFF'; 
    responseHeaders.set('Content-Disposition', `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.csv"`);

    // 5. 返回CSV内容
    return new NextResponse(BOM + csvContent, {
        status: 200,
        headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('导出客户数据 API (Admin) 出错:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
