
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
  const salt = Buffer.alloc(SALT_LENGTH, 'fixed-salt-for-pbkdf2'); // Use the same salt as encryption
  return crypto.pbkdf2Sync(secret, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha512');
};

// --- Helper Function for Decryption ---
const decryptIdCard = (encryptedIdCardHex: string): string | null => {
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(encryptedIdCardHex, 'hex');

    // Extract IV, AuthTag, and Encrypted Data from the stored hex string
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
    return null; // Return null or a placeholder if decryption fails
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
  // Early check for the encryption secret
    if (!process.env.ID_CARD_ENCRYPTION_SECRET) {
        console.error('Missing ID_CARD_ENCRYPTION_SECRET environment variable.');
        return NextResponse.json({ message: '服务器配置错误：缺少 ID_CARD_ENCRYPTION_SECRET 环境变量' }, { status: 500 });
    }

  try {
    const session = await getServerSession(authOptions);

    // 1. Check Authentication and Authorization (ADMIN only)
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Fetch all customers with partner info
    const customers = await prisma.customer.findMany({
      include: {
        registeredBy: { // Include related partner information
          select: {
            name: true,
            email: true,
          }
        },
      },
      orderBy: {
        registrationDate: 'asc', // Order by registration date for consistency
      },
    });

    // 3. Prepare CSV Data
    const headers = [
      'ID', 
      '客户姓名',
      '单位名称',
      '去年营收',
      '身份证号(解密后)', 
      '联系电话', 
      '联系地址', 
      '状态', 
      '备注', 
      '报备人姓名', 
      '报备人邮箱', 
      '报备日期',
      '最后更新日期'
    ];
    
    const rows = customers.map(customer => {
        const decryptedIdCard = decryptIdCard(customer.idCardNumberEncrypted);
        return [
            customer.id,
            customer.name,
            customer.companyName || 'N/A',
            customer.lastYearRevenue || 'N/A',
            decryptedIdCard || '[解密失败]', // Show decrypted ID or error placeholder
            customer.phone,
            customer.address,
            customer.status,
            customer.notes,
            customer.registeredBy.name || 'N/A',
            customer.registeredBy.email,
            customer.registrationDate.toISOString(),
            customer.updatedAt.toISOString()
        ].map(escapeCsvField); // Escape each field
    });

    // Combine headers and rows into CSV string
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // 4. Set Response Headers for CSV Download
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    // Add BOM for UTF-8 compatibility with Excel
    const BOM = '\uFEFF'; 
    responseHeaders.set('Content-Disposition', `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.csv"`);

    // 5. Return CSV Content
    return new NextResponse(BOM + csvContent, {
        status: 200,
        headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('导出客户数据 API (Admin) 出错:', error);
    // Handle specific errors like missing encryption key
    if (error instanceof Error && error.message.includes('ID_CARD_ENCRYPTION_SECRET')) {
         return NextResponse.json({ message: '服务器配置错误，无法解密数据' }, { status: 500 });
    }
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
