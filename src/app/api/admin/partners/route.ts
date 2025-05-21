import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client'; // Import Role enum
import { isAdmin } from '@/lib/auth-helpers';

// 告诉 Next.js 这个路由是动态的
export const dynamic = 'force-dynamic';

// --- Zod Schema for Creating Partner ---
const createPartnerSchema = z.object({
  name: z.string().min(1, { message: "名称不能为空" }).trim(),
  email: z.string().email({ message: "无效的邮箱格式" }).trim(),
  password: z.string().min(8, { message: "密码至少需要8位" }),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  accountHolder: z.string().optional(),
  taxId: z.string().optional(),
  invoiceTitle: z.string().optional(),
  invoiceAddress: z.string().optional(),
  invoicePhone: z.string().optional(),
});

// === GET Handler (Existing) ===
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // 使用isAdmin辅助函数检查权限，允许SUPER_ADMIN和ADMIN角色
    if (!isAdmin(session)) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const pageStr = searchParams.get('page') || '1';
    const limitStr = searchParams.get('limit') || '10';
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);

    // 验证分页参数
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return NextResponse.json({ message: '无效的分页参数' }, { status: 400 });
    }

    // 计算分页偏移量
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where = {
      role: Role.PARTNER,
      OR: search ? [
        { name: { contains: search } },
        { email: { contains: search } },
        { companyName: { contains: search } },
      ] : undefined
    };

    // 获取符合条件的合作伙伴总数
    const total = await prisma.user.count({
      where
    });

    // 获取合作伙伴列表
    const partners = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        // 公司基本信息
        companyName: true,
        phone: true,
        address: true,
        // 发票信息
        taxId: true,
        invoiceTitle: true,
        // 客户统计
        _count: {
          select: {
            customers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // 返回合作伙伴列表和分页信息
    return NextResponse.json({
      partners,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取合作伙伴列表失败:', error);
    return NextResponse.json(
      { message: '获取合作伙伴列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// === POST Handler (Create Partner) ===
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // 验证管理员权限
    if (!isAdmin(session)) {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 验证请求体
    const body = await request.json();
    const validation = createPartnerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        message: '无效的请求数据', 
        errors: validation.error.format() 
      }, { status: 400 });
    }

    const { 
      email, 
      password, 
      name, 
      companyName, 
      phone, 
      address,
      bankName,
      bankAccount,
      accountHolder,
      taxId,
      invoiceTitle,
      invoiceAddress,
      invoicePhone
    } = validation.data;

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ message: '该邮箱已被注册' }, { status: 409 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新合作伙伴
    const newPartner = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        role: Role.PARTNER,
        isActive: true,
        // 公司基本信息
        companyName,
        phone,
        address,
        // 银行账户信息
        bankName,
        bankAccount,
        accountHolder,
        // 发票信息
        taxId,
        invoiceTitle,
        invoiceAddress,
        invoicePhone
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        // 公司基本信息
        companyName: true,
        phone: true,
        address: true,
      }
    });

    return NextResponse.json({
      message: '合作伙伴创建成功',
      partner: newPartner
    }, { status: 201 });

  } catch (error) {
    console.error('创建合作伙伴失败:', error);
    return NextResponse.json(
      { message: '创建合作伙伴失败', error: String(error) },
      { status: 500 }
    );
  }
}
