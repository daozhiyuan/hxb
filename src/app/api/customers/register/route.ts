import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // 修正为正确的auth路径
import prisma from '@/lib/prisma'; // 修正为正确的prisma客户端路径
import { z } from 'zod';
import crypto from 'crypto'; // For hashing and encryption
import { customers_status as CustomerStatus } from '@prisma/client';
import { safeCreateCustomer, safeFindCustomerByIdCardHash } from '@/lib/prisma-helpers';
import { CustomerStatusEnum } from '@/config/client-config';
import { IdCardType, validateIdCard } from '@/lib/client-validation';
import { encryptIdCard, hashIdCard } from '@/lib/encryption';

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
  idCardNumber: z.string().min(1, { message: '证件号码不能为空' }).trim(),
  idCardType: z.string().default(IdCardType.CHINA_MAINLAND),
  phone: z.union([z.string(), z.null()]).optional().default(null),
  address: z.union([z.string(), z.null()]).optional().default(null),
  status: z.enum(validStatuses as [string, ...string[]]).default(CustomerStatusEnum.FOLLOWING),
  notes: z.string().min(1, { message: '备注不能为空' }).trim(),
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

// --- API Handler ---
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const data = await request.json();
    console.log('接收到的客户数据:', data);

    // 使用Zod schema验证数据
    const validationResult = registerCustomerSchema.safeParse(data);
    if (!validationResult.success) {
      console.error('数据验证失败:', validationResult.error);
      return NextResponse.json(
        { error: '数据验证失败', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    console.log('验证后的客户数据:', validatedData);

    // 加密身份证号
    const encryptedIdCard = encryptIdCard(validatedData.idCardNumber);
    const hashedIdCard = hashIdCard(validatedData.idCardNumber);

    // 检查身份证号是否已存在
    const existingCustomer = await prisma.customer.findFirst({
      where: { idCardHash: hashedIdCard }
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: '该证件号码已被报备，如有异议请提交申诉' },
        { status: 409 }
      );
    }

    // 创建客户记录
    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
        idCardNumberEncrypted: encryptedIdCard,
        idCardHash: hashedIdCard,
        notes: validatedData.notes,
        companyName: validatedData.companyName,
        lastYearRevenue: validatedData.lastYearRevenue,
        phone: validatedData.phone,
        address: validatedData.address,
        status: validatedData.status,
        jobTitle: validatedData.jobTitle,
        industry: validatedData.industry,
        source: validatedData.source,
        position: validatedData.position,
        idCardType: validatedData.idCardType,
        registeredBy: {
          connect: {
            id: session.user.id
          }
        }
      }
    });

    console.log('成功创建客户记录:', customer);
    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error('注册客户失败:', error);
    // 返回更详细的错误信息
    return NextResponse.json(
      { 
        error: '注册客户失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
