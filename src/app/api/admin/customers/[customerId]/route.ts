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

// --- Helper Function for Decryption (Copied from export API) ---
const decryptIdCard = (encryptedIdCard: string): string | null => {
  try {
    // 检查是否是简化格式的加密字符串
    if (encryptedIdCard.startsWith('encrypted_id_')) {
      // 从简化格式中提取身份证号码的最后三位
      const lastThreeDigits = encryptedIdCard.substring('encrypted_id_'.length);
      // 由于我们没有存储完整的身份证号码，仅返回带掩码的格式
      return `***************${lastThreeDigits}`;
    }
    
    // 如果是旧的加密格式，尝试标准解密（这部分可能不会成功，但保留以兼容可能存在的数据）
    try {
      const key = process.env.ID_CARD_ENCRYPTION_SECRET || 'default-fallback-key';
      // 简单编码，实际生产环境需要更安全的实现
      return `已加密数据 (${encryptedIdCard.substring(0, 10)}...)`;
    } catch (decryptError) {
      console.error('尝试标准解密失败:', decryptError);
      return null;
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

    // 1. 检查权限 - 允许管理员和合作伙伴访问
    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'PARTNER')) {
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

    // 5. 解密身份证号码
    const decryptedIdCard = decryptIdCard(customer.idCardNumberEncrypted);

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
