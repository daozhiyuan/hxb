import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // 修正为正确的auth路径
import prisma from '@/lib/prisma'; // 修正为正确的prisma客户端路径
import { z } from 'zod';
// 移除Prisma客户端导入，改为自定义枚举
// import { customers_status as CustomerStatus } from '@prisma/client';
import { safeCreateCustomer, safeFindCustomerByIdCardHash, safeCheckDuplicateCustomer } from '@/lib/prisma-helpers';
import { CustomerStatusEnum } from '@/config/client-config';
import { IdCardType, validateIdCard } from '@/lib/client-validation';
import { encryptIdCard, hashIdCard } from '@/lib/encryption';

// 设置为动态路由
export const dynamic = 'force-dynamic';

// 定义有效的状态值
const validStatuses = Object.values(CustomerStatusEnum) as readonly string[];

// 移除冗余的加密/解密设置
// 已统一使用lib/encryption.ts中的加密函数

// Define the expected input schema using Zod
const registerCustomerSchema = z.object({
  name: z.string().min(1, { message: '客户姓名不能为空' }).trim(),
  idCardNumber: z.string().min(1, { message: '证件号码不能为空' }).trim(),
  idCardType: z.string().default(IdCardType.CHINA_MAINLAND),
  phone: z.union([z.string(), z.null()]).optional().default(null),
  email: z.union([z.string(), z.null()]).optional().default(null),
  address: z.union([z.string(), z.null()]).optional().default(null),
  status: z.enum(validStatuses as [string, ...string[]]).default(CustomerStatusEnum.FOLLOWING),
  notes: z.string().min(1, { message: '备注不能为空' }).trim(),
  jobTitle: z.union([z.string(), z.null()]).optional().default(null),
  industry: z.union([z.string(), z.null()]).optional().default(null),
  source: z.union([z.string(), z.null()]).optional().default(null),
});

// 移除冗余的getEncryptionKey函数
// 已统一使用lib/encryption.ts中的加密函数

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
    const { success: checkSuccess, isDuplicate } = await safeCheckDuplicateCustomer(hashedIdCard);
    
    if (!checkSuccess) {
      return NextResponse.json(
        { error: '查重失败，请稍后重试' },
        { status: 500 }
      );
    }

    if (isDuplicate) {
      return NextResponse.json(
        { error: '该证件号码已被报备，如有异议请提交申诉' },
        { status: 409 }
      );
    }

    // 创建客户记录，使用safeCreateCustomer替代直接调用Prisma
    const { success, customer, error } = await safeCreateCustomer({
      name: validatedData.name,
      idNumber: encryptedIdCard,
      idNumberHash: hashedIdCard,
      notes: validatedData.notes,
      phone: validatedData.phone,
      email: validatedData.email,
      address: validatedData.address,
      status: validatedData.status,
      jobTitle: validatedData.jobTitle,
      industry: validatedData.industry,
      source: validatedData.source,
      idCardType: validatedData.idCardType,
      registeredByPartnerId: session.user.id
    });

    if (!success) {
      console.error('创建客户记录失败:', error);
      return NextResponse.json(
        { 
          error: '注册客户失败',
          details: error instanceof Error ? error.message : '未知错误'
        },
        { status: 500 }
      );
    }

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
