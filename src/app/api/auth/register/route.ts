'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

// --- Zod Schema for Public Registration ---
const registerSchema = z.object({
  name: z.string().min(1, { message: "名称不能为空" }).trim(),
  email: z.string().email({ message: "无效的邮箱格式" }).trim(),
  password: z.string().min(8, { message: "密码至少需要8位" }),
});

// === POST Handler for Public Registration ===
export async function POST(request: Request) {
  try {
    // 1. Parse and Validate Request Body
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { name, email, password } = validation.data;

    // 2. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json({ message: '该邮箱已被注册，请尝试登录或使用其他邮箱。' }, { status: 409 }); // 409 Conflict
    }

    // 3. Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create the new partner user with isActive: false
    const newPartner = await prisma.user.create({
      data: {
        name: name,
        email: email,
        passwordHash: passwordHash,
        role: Role.PARTNER,
        isActive: false, // <<< Important: Set to false, requires admin approval
      },
      select: { // Return only safe fields
          id: true,
          name: true,
          email: true,
          isActive: true, // Return isActive status
      }
    });

    // 5. Return Success Response
    // Let the user know they need admin approval
    return NextResponse.json({
         message: '注册成功！请等待管理员审核您的账号。' , 
         user: newPartner 
        }, { status: 201 });

  } catch (error) {
    console.error('公共注册 API 出错:', error);
    // Handle potential Prisma errors e.g., unique constraint
    if (error instanceof Error && (error as any).code === 'P2002') { 
         return NextResponse.json({ message: '该邮箱已被注册' }, { status: 409 });
    }
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
