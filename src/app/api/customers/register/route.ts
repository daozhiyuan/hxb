import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/db'; // 使用新的prisma客户端
import { z } from 'zod';
import crypto from 'crypto'; // For hashing and encryption
import {CustomerStatus} from "@prisma/client";

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

// 简化版加密函数，仅用于测试
const encryptIdCard = (idCardNumber: string): string => {
  return `encrypted_id_${idCardNumber.substring(idCardNumber.length - 3)}`;
};

// 简化版哈希函数，仅用于测试
const hashIdCard = (idCardNumber: string): string => {
  return `hash_${idCardNumber.substring(idCardNumber.length - 3)}`;
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
