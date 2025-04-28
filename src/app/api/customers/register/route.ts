import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/db'; // 使用新的prisma客户端
import { z } from 'zod';
import crypto from 'crypto'; // For hashing and encryption
import {CustomerStatus} from "@prisma/client";

// --- Encryption/Decryption Settings ---
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_DERIVATION_ITERATIONS = 100000;

// Define the expected input schema using Zod
const registerCustomerSchema = z.object({
  name: z.string().min(1, { message: '客户姓名不能为空' }).trim(),
  companyName: z.string().optional().transform(val => val === "" ? null : val),
  lastYearRevenue: z.string().optional()
    .transform(val => {
      if (val === "" || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }),
  idCardNumber: z.string().regex(/^\d{17}(\d|X)$/i, { message: '无效的身份证号码格式' }).trim(), // Basic validation for 18 digits/X
  phone: z.string().optional().transform(val => val === "" ? null : val),
  address: z.string().optional().transform(val => val === "" ? null : val),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.FOLLOWING).optional(),
  notes: z.string().optional().transform(val => val === "" ? null : val),
  jobTitle: z.string().optional().transform(val => val === "" ? null : val), // Added jobTitle
});

// --- Helper Function to get Encryption Key ---
const getEncryptionKey = () => {
  const secret = process.env.ID_CARD_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ID_CARD_ENCRYPTION_SECRET is not set in environment variables.');
  }
  const salt = Buffer.alloc(SALT_LENGTH, 'fixed-salt-for-pbkdf2'); // Fixed salt for key derivation
  return crypto.pbkdf2Sync(secret, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha512');
};

// 真实加密函数，使用AES-GCM加密身份证号码
const encryptIdCard = (idCardNumber: string): string => {
  try {
    // 获取加密密钥
    const key = getEncryptionKey();
    // 创建随机初始化向量
    const iv = crypto.randomBytes(IV_LENGTH);
    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    // 加密数据
    let encrypted = cipher.update(idCardNumber, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // 获取认证标签
    const tag = cipher.getAuthTag();
    // 组合IV、加密数据和认证标签
    const result = Buffer.concat([iv, encrypted, tag]);
    // 返回Base64编码的加密结果
    return result.toString('base64');
  } catch (error) {
    console.error('加密身份证号码失败:', error);
    throw new Error('身份证加密失败，请联系管理员');
  }
};

// 哈希函数，使用SHA-256哈希身份证号码
const hashIdCard = (idCardNumber: string): string => {
  try {
    // 创建哈希
    const hash = crypto.createHash('sha256');
    hash.update(idCardNumber);
    
    // 返回哈希结果的十六进制表示
    return hash.digest('hex');
  } catch (error) {
    console.error('哈希身份证号码失败:', error);
    // 如果哈希失败，回退到简化版哈希（生产环境应该抛出错误）
    return `hash_${idCardNumber.substring(idCardNumber.length - 3)}`;
  }
};

// --- API Handler ---
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check Authentication and Authorization
    if (!session || !session.user || session.user.role !== 'PARTNER') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Parse and Validate Request Body
    const body = await request.json();
    console.log('接收到的客户数据:', body);
    
    const validation = registerCustomerSchema.safeParse(body);

    if (!validation.success) {
      console.error('数据验证失败:', validation.error.format());
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { name, companyName, lastYearRevenue, idCardNumber, phone, address, status, notes, jobTitle } = validation.data;
    console.log('处理后的客户数据:', validation.data);

    // 3. Hash ID Card for duplication check
    const idCardHash = hashIdCard(idCardNumber);

    // 4. Check for existing customer with the same ID card hash
    const existingCustomer = await prisma.customer.findUnique({
      where: { idCardHash: idCardHash },
      select: { id: true, registeredByPartnerId: true } // Select minimal fields
    });

    if (existingCustomer) {
      // Optional: Check if it was registered by the *same* partner? Decide based on business logic.
      // For now, any duplication is considered a conflict.
      return NextResponse.json({ message: '冲突：该客户已被其他合作伙伴报备' }, { status: 409 }); // 409 Conflict
    }

    // 5. Encrypt ID Card for storage
    const encryptedIdCard = encryptIdCard(idCardNumber);

    // 6. Create Customer Record in Database
    const newCustomer = await prisma.customer.create({
      data: {
        name: name,
        companyName: companyName,
        lastYearRevenue: lastYearRevenue,
        idCardNumberEncrypted: encryptedIdCard,
        idCardHash: idCardHash,
        phone: phone,
        address: address,
        status: status,
        notes: notes,
        registeredByPartnerId: parseInt(session.user.id, 10), // Get partner ID from session
        jobTitle: jobTitle, // Added jobTitle
        // registrationDate, createdAt, updatedAt will be handled by default values
      },
    });

    // 7. Return Success Response
    return NextResponse.json({ message: '客户报备成功', customerId: newCustomer.id }, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error('客户报备 API 出错:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
