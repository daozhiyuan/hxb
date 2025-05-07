import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client'; // Import Role enum

// 告诉 Next.js 这个路由是动态的
export const dynamic = 'force-dynamic';

// --- Zod Schema for Creating Partner ---
const createPartnerSchema = z.object({
  name: z.string().min(1, { message: "名称不能为空" }).trim(),
  email: z.string().email({ message: "无效的邮箱格式" }).trim(),
  password: z.string().min(8, { message: "密码至少需要8位" }),
});

// === GET Handler (Existing) ===
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }
    const partners = await prisma.user.findMany({
      where: { role: 'PARTNER' },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(partners, { status: 200 });
  } catch (error) {
    console.error('获取合作伙伴列表 API (Admin) 出错:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}

// === POST Handler (New) ===
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check Authentication and Authorization (ADMIN only)
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Parse and Validate Request Body
    const body = await request.json();
    const validation = createPartnerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { name, email, password } = validation.data;

    // 3. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json({ message: '该邮箱已被注册' }, { status: 409 }); // 409 Conflict
    }

    // 4. Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Create the new partner user
    const newPartner = await prisma.user.create({
      data: {
        name: name,
        email: email,
        passwordHash: passwordHash,
        role: Role.PARTNER, // Explicitly set role to PARTNER
        isActive: true, // Default to active
      },
      select: { // Return only safe fields
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
      }
    });

    // 6. Return Success Response
    return NextResponse.json(newPartner, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('创建合作伙伴 API (Admin) 出错:', error);
    // Handle potential Prisma errors e.g. unique constraint
    if (error instanceof Error && (error as any).code === 'P2002') { // Prisma unique constraint violation code
         return NextResponse.json({ message: '该邮箱已被注册' }, { status: 409 });
    }
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
