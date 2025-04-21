'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
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
const decryptIdCard = (encryptedIdCardHex: string): string | null => {
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(encryptedIdCardHex, 'hex');
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encryptedData = buffer.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedData.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt ID card:', error);
    return null;
  }
};

// GET handler to fetch a single customer's details for ADMIN
export async function GET(request: Request, { params }: { params: { customerId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const customerId = parseInt(params.customerId, 10);

    // 1. Check Authentication and Authorization (ADMIN only)
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Validate customerId
    if (isNaN(customerId)) {
        return NextResponse.json({ message: '无效的客户 ID' }, { status: 400 });
    }

    // 3. Fetch customer details
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: { // Include partner info as well
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

    // 4. Decrypt ID Card Number
    const decryptedIdCard = decryptIdCard(customer.idCardNumberEncrypted);

    // 5. Prepare response data (exclude encrypted value and hash)
    const responseData = {
        ...customer,
        idCardNumberEncrypted: undefined, // Remove encrypted value
        idCardHash: undefined,           // Remove hash value
        decryptedIdCardNumber: decryptedIdCard || '[解密失败或无权限]', // Add decrypted value or placeholder
    };

    // 6. Return Success Response
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`获取客户详情 API (Admin) 出错 (ID: ${params.customerId}):`, error);
    if (error instanceof Error && error.message.includes('ID_CARD_ENCRYPTION_SECRET')) {
         return NextResponse.json({ message: '服务器配置错误，无法解密数据' }, { status: 500 });
    }
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
