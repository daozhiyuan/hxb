import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus, Role } from '@prisma/client';
import { encryptIdCard, hashIdCard, validateIdCard } from '@/lib/encryption';
import { hasPermission, isAdmin } from '@/lib/auth-helpers';
import { generateIdNumberHash } from '@/lib/utils';

// 直接定义API配置属性
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const dynamicParams = true;

// Schema for validating the POST request body
const createAppealSchema = z.object({
  customerName: z.string().min(1, '请输入客户姓名'),
  idNumber: z.string().min(1, '请输入身份证号码')
    .refine(value => {
      // 检查是否有足够的长度
      if (value.length !== 18) {
        return false;
      }
      return true;
    }, {
      message: '身份证号码必须为18位',
    })
    .refine(value => {
      // 使用完整的验证函数检查身份证号码
      return validateIdCard(value);
    }, {
      message: '身份证号码格式不正确',
    }),
  reason: z.string().min(1, '请输入申诉原因'),
  evidence: z.string().nullable().optional(),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  source: z.string().optional(),
});

type CreateAppealInput = z.infer<typeof createAppealSchema>;

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
      console.error('未授权访问: 用户未登录');
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '10', 10),
      status: searchParams.get('status') as AppealStatus | null,
      search: searchParams.get('search'),
    };

    console.log('查询参数:', query);

    // Validate page and pageSize
    if (isNaN(query.page) || isNaN(query.pageSize) || query.page < 1 || query.pageSize < 1) {
      console.error('无效的分页参数:', query);
      return NextResponse.json({ message: '无效的分页参数' }, { status: 400 });
    }

    // Build where clause - 使用统一的权限检查逻辑
    const where = {
      ...(isAdmin(session) ? {} : { partnerId: Number(session.user.id) }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { customerName: { contains: query.search } },
          { reason: { contains: query.search } },
        ],
      } : {}),
    };

    console.log('查询条件:', where);

    try {
      // Get total count
      const total = await prisma.appeal.count({ where });
      const totalPages = Math.ceil(total / query.pageSize);

      console.log('总数:', total, '总页数:', totalPages);

      // Get appeals with pagination
      const appeals = await prisma.appeal.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: {
          createdAt: 'desc',
        },
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
      });

      console.log('查询结果数量:', appeals.length);

      // Return paginated response
      return NextResponse.json({
        items: appeals,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages,
        },
      });
    } catch (dbError: any) {
      console.error('数据库查询错误:', dbError);
      return NextResponse.json({ 
        message: '数据库查询错误', 
        error: dbError.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('获取申诉列表失败:', error);
    return NextResponse.json({ 
      message: '服务器内部错误', 
      error: error.message 
    }, { status: 500 });
  }
}

// POST: 创建新申诉
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    const data = await request.json();
    const { customerName, idNumber, reason, evidence, previousAppealId } = data;

    // 验证必填字段
    if (!customerName || !idNumber || !reason) {
      return NextResponse.json(
        { message: '创建申诉失败', details: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    try {
      // 生成身份证号码哈希
      const idNumberHash = await generateIdNumberHash(idNumber);

      // 检查是否已存在相同身份证号码的申诉
      const existingAppeal = await prisma.appeal.findFirst({
        where: { idNumberHash },
        orderBy: { createdAt: 'desc' }
      });

      if (existingAppeal) {
        // 如果是重新上诉，允许创建新的申诉
        if (previousAppealId && existingAppeal.id === parseInt(previousAppealId)) {
          const appeal = await prisma.appeal.create({
            data: {
              customerName,
              idNumber,
              idNumberHash,
              reason,
              evidence,
              partnerId: Number(session.user.id),
              status: AppealStatus.PENDING,
              previousAppealId: parseInt(previousAppealId)
            },
          });

          // 创建申诉日志
          await prisma.appealLog.create({
            data: {
              appealId: appeal.id,
              action: 'CREATE',
              operatorId: Number(session.user.id),
              remarks: '重新上诉',
            },
          });

          return NextResponse.json(appeal);
        }

        return NextResponse.json(
          {
            message: '创建申诉失败',
            details: '该身份证号码已存在申诉记录，请勿重复提交',
            code: 'DUPLICATE_APPEAL'
          },
          { status: 409 }
        );
      }

      // 创建申诉记录
      const appeal = await prisma.appeal.create({
        data: {
          customerName,
          idNumber,
          idNumberHash,
          reason,
          evidence,
          partnerId: Number(session.user.id),
          status: AppealStatus.PENDING,
          previousAppealId: previousAppealId ? parseInt(previousAppealId) : null
        },
      });

      // 创建申诉日志
      await prisma.appealLog.create({
        data: {
          appealId: appeal.id,
          action: 'CREATE',
          operatorId: Number(session.user.id),
          remarks: previousAppealId ? '重新上诉' : '创建申诉',
        },
      });

      return NextResponse.json(appeal);
    } catch (error) {
      console.error('创建申诉失败:', error);
      return NextResponse.json(
        {
          message: '创建申诉失败',
          details: error instanceof Error ? error.message : '未知错误',
          code: 'CREATE_APPEAL_ERROR'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('处理请求失败:', error);
    return NextResponse.json(
      { message: '服务器错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}