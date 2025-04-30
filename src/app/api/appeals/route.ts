import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus } from '@prisma/client';
import { encryptIdCard, hashIdCard } from '@/lib/encryption';

// 创建申诉的数据验证 Schema
const createAppealSchema = z.object({
  customerName: z.string().min(2, { message: '客户姓名至少需要2个字符' }),
  idNumber: z.string().regex(
    /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/,
    { message: '请输入有效的身份证号码' }
  ),
  reason: z.string().min(10, { message: '申诉原因至少需要10个字符' }).max(500, { message: '申诉原因不能超过500个字符' }),
  evidence: z.array(z.string()).optional(),
});

// 查询参数验证 Schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  status: z.nativeEnum(AppealStatus).optional(),
  search: z.string().optional(),
});

// GET: 获取申诉列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
    });

    // 构建查询条件
    const where = {
      ...(session.user.role !== 'ADMIN' ? { partnerId: parseInt(session.user.id, 10) } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { customerName: { contains: query.search } },
          { reason: { contains: query.search } },
        ],
      } : {}),
    };

    // 计算分页
    const skip = (query.page - 1) * query.pageSize;

    // 并行查询总数和数据
    const [total, appeals] = await Promise.all([
      prisma.appeal.count({ where }),
      prisma.appeal.findMany({
        where,
        skip,
        take: query.pageSize,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          operator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      items: appeals,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });

  } catch (error) {
    console.error('获取申诉列表失败:', error);
    return NextResponse.json(
      { message: '获取申诉列表失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// POST: 创建新申诉
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // 验证请求数据
    const body = await request.json();
    const validation = createAppealSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: '请求数据无效', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { customerName, idNumber, reason, evidence = [] } = validation.data;

    // 生成身份证号码的哈希值（用于查重）
    const idNumberHash = hashIdCard(idNumber);

    // 检查是否存在重复申诉
    const existingAppeal = await prisma.appeal.findFirst({
      where: {
        idNumberHash,
        status: {
          in: [AppealStatus.PENDING, AppealStatus.PROCESSING],
        },
      },
    });

    if (existingAppeal) {
      return NextResponse.json(
        { message: '该客户已有正在处理的申诉' },
        { status: 409 }
      );
    }

    // 加密身份证号码
    const encryptedIdNumber = encryptIdCard(idNumber);

    // 创建申诉记录
    const appeal = await prisma.appeal.create({
      data: {
        customerName,
        idNumber: encryptedIdNumber,
        idNumberHash,
        reason,
        evidence,
        partnerId: parseInt(session.user.id, 10),
        status: AppealStatus.PENDING,
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 创建审计日志
    await prisma.appealLog.create({
      data: {
        appealId: appeal.id,
        action: 'CREATE',
        operatorId: parseInt(session.user.id, 10),
        remarks: '创建申诉',
      },
    });

    return NextResponse.json(appeal, { status: 201 });

  } catch (error) {
    console.error('创建申诉失败:', error);
    return NextResponse.json(
      { message: '创建申诉失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 