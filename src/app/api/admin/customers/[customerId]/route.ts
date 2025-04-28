'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/db'; // 使用新的db.ts中的prisma客户端
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
  const salt = Buffer.alloc(SALT_LENGTH, 'fixed-salt-for-pbkdf2');
  return crypto.pbkdf2Sync(secret, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha512');
};

// 解密函数，始终返回真实身份证号码
const decryptIdCard = (encryptedIdCard: string, userRole: string): string | null => {
  try {
    // 处理标准格式的加密数据
    try {
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
      return '[解密失败]';
    }
  } catch (error) {
    console.error('解密身份证号码失败:', error);
    return null;
  }
};

// GET handler to fetch a single customer's details for ADMIN
export async function GET(request: Request, { params }: { params: { customerId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const customerId = parseInt(params.customerId, 10);

    // 1. 检查权限 - 允许管理员、超级管理员和合作伙伴访问
    if (!session || !session.user || 
        (session.user.role !== 'ADMIN' && 
         session.user.role !== 'PARTNER' && 
         session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. 验证客户ID
    if (isNaN(customerId)) {
      return NextResponse.json({ message: '无效的客户 ID' }, { status: 400 });
    }

    // 3. 获取客户详情
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: { // 包括注册该客户的合作伙伴信息
        registeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ message: '客户记录不存在' }, { status: 404 });
    }

    // 4. 检查权限 - 合作伙伴只能查看自己注册的客户
    if (session.user.role === 'PARTNER' && customer.registeredByPartnerId !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ message: '无权访问此客户信息' }, { status: 403 });
    }

    // 5. 解密身份证号码 - 根据角色提供不同级别的信息
    const userRole = session.user.role;
    const decryptedIdCard = decryptIdCard(customer.idCardNumberEncrypted, userRole);

    // 6. 准备响应数据（移除加密值和哈希）
    const responseData = {
      ...customer,
      idCardNumberEncrypted: undefined, // 移除加密值
      idCardHash: undefined,           // 移除哈希值
      decryptedIdCardNumber: decryptedIdCard || '[解密失败或无权限]', // 添加解密值或占位符
    };

    // 7. 返回成功响应
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`获取客户详情 API 出错 (ID: ${params.customerId}):`, error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
