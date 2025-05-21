import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
// 告诉 Next.js 这个路由是动态的

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 验证必填字段
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已被注册
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: '该邮箱已被注册' },
        { status: 409 }
      );
    }

    // 创建新用户
    const hashedPassword = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: Role.PARTNER,
        isActive: false, // 默认未激活，需要管理员审核
      },
    });

    return NextResponse.json({
      message: '注册成功，请等待管理员审核激活您的账号',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { message: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
} 