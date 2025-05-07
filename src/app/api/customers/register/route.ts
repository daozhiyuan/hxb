import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // 修正为正确的auth路径
import prisma from '@/lib/prisma'; // 修正为正确的prisma客户端路径
import { z } from 'zod';
import crypto from 'crypto'; // For hashing and encryption
import { customers_status as CustomerStatus } from '@prisma/client';
import { safeCreateCustomer, safeFindCustomerByIdCardHash } from '@/lib/prisma-helpers';
import { CustomerStatusEnum } from '@/config/client-config';

// 设置为动态路由
export const dynamic = 'force-dynamic';

// 创建本地枚举定义，与Prisma Schema中的customers_status保持一致
// 使用从客户端配置导入的枚举，确保前后端一致
// const CustomerStatusEnum = {
//   FOLLOWING: 'FOLLOWING',
//   NEGOTIATING: 'NEGOTIATING',
//   PENDING: 'PENDING',
//   SIGNED: 'SIGNED',
//   COMPLETED: 'COMPLETED',
//   LOST: 'LOST'
// } as const;

// 定义有效的状态值
const validStatuses = Object.values(CustomerStatusEnum) as readonly string[];

// 告诉 Next.js 这个路由是动态的

// --- Encryption/Decryption Settings ---
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_DERIVATION_ITERATIONS = 100000;

// Define the expected input schema using Zod
const registerCustomerSchema = z.object({
  name: z.string().min(1, { message: '客户姓名不能为空' }).trim(),
  companyName: z.union([z.string(), z.null()]).optional().default(null),
  lastYearRevenue: z.union([z.number(), z.null(), z.string().transform(val => val === '' ? null : Number(val))]).optional().default(null),
  idCardNumber: z.string().regex(/^\d{17}(\d|X)$/i, { message: '无效的身份证号码格式' }).trim(), // Basic validation for 18 digits/X
  phone: z.union([z.string(), z.null()]).optional().default(null),
  address: z.union([z.string(), z.null()]).optional().default(null),
  status: z.enum(validStatuses as [string, ...string[]]).default(CustomerStatusEnum.FOLLOWING),
  notes: z.union([z.string(), z.null()]).optional().default(null),
  jobTitle: z.union([z.string(), z.null()]).optional().default(null),
  industry: z.union([z.string(), z.null()]).optional().default(null),
  source: z.union([z.string(), z.null()]).optional().default(null),
  position: z.union([z.string(), z.null()]).optional().default(null),
});

// --- Helper Function to get Encryption Key ---
const getEncryptionKey = () => {
  try {
    const secret = process.env.ID_CARD_ENCRYPTION_SECRET;
    if (!secret) {
      console.warn('警告: ID_CARD_ENCRYPTION_SECRET 环境变量未设置，使用开发环境默认密钥');
      // 在开发环境中使用一个默认密钥，生产环境中应该抛出错误
      return process.env.NODE_ENV === 'production' 
        ? crypto.randomBytes(32) // 生产环境生成随机密钥，但这意味着每次重启都无法解密旧数据
        : Buffer.from('default-encryption-key-for-development-only', 'utf-8').slice(0, 32);
    }
    const salt = Buffer.alloc(SALT_LENGTH, 'fixed-salt-for-pbkdf2'); // Fixed salt for key derivation
    return crypto.pbkdf2Sync(secret, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha512');
  } catch (error) {
    console.error('获取加密密钥失败:', error);
    // 返回开发环境默认密钥作为兜底方案
    return Buffer.from('default-encryption-key-for-development-only', 'utf-8').slice(0, 32);
  }
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
    if (!session || !session.user) {
      return NextResponse.json({ message: '未授权访问，请先登录' }, { status: 401 });
    }

    // 2. Parse and Validate Request Body
    const body = await request.json();
    console.log('接收到的客户数据:', body);
    
    const validation = registerCustomerSchema.safeParse(body);

    if (!validation.success) {
      console.error('数据验证失败:', validation.error.format());
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { 
      name, companyName, lastYearRevenue, idCardNumber, phone, address, 
      status, notes, jobTitle, industry, source, position 
    } = validation.data;
    
    console.log('处理后的客户数据:', validation.data);

    // 3. Hash ID Card for duplication check
    const idCardHash = hashIdCard(idCardNumber);

    // 4. Check for existing customer with the same ID card hash
    const existingCustomerResult = await safeFindCustomerByIdCardHash(idCardHash);

    if (existingCustomerResult.success && existingCustomerResult.customer) {
      // 客户已存在
      return NextResponse.json({ message: '冲突：该客户已被其他合作伙伴报备' }, { status: 409 }); // 409 Conflict
    }

    // 5. Encrypt ID Card for storage
    const encryptedIdCard = encryptIdCard(idCardNumber);

    // 6. Create Customer Record in Database using safe helper
    try {
      const result = await safeCreateCustomer({
        name,
        companyName,
        lastYearRevenue,
        idCardNumberEncrypted: encryptedIdCard,
        idCardHash,
        phone,
        address,
        status,
        notes,
        jobTitle,
        industry,
        source,
        position,
        registeredByPartnerId: Number(session.user.id)
      });

      if (!result.success) {
        throw result.error;
      }

      // 确保customer存在
      if (!result.customer) {
        throw new Error('创建客户记录失败：系统未返回客户ID');
      }

    // 7. Return Success Response
      return NextResponse.json({ message: '客户报备成功', customerId: result.customer.id }, { status: 201 }); // 201 Created
    } catch (error) {
      console.error('创建客户记录失败:', error);
      return NextResponse.json({ message: '创建客户记录失败，请联系管理员' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('客户报备 API 出错:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
