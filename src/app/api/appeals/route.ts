import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { AppealStatus, Role } from '@prisma/client';
import { encryptIdCard, hashIdCard, validateIdCard, decryptIdCard } from '@/lib/encryption';
import { hasPermission, isAdmin, isSuperAdmin } from '@/lib/auth-helpers';
import { generateIdNumberHash } from '@/lib/utils';
import { IdCardType } from '@/lib/client-validation';

// 直接定义API配置属性
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const dynamicParams = true;

// Schema for validating the POST request body
const createAppealSchema = z.object({
  customerName: z.string().min(1, '请输入客户姓名'),
  idNumber: z.string().min(1, '请输入证件号码'),
  idCardType: z.nativeEnum(IdCardType).default(IdCardType.CHINA_MAINLAND),
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

      // 处理结果：如果是超级管理员，添加解密的证件号码
      const processedAppeals = appeals.map((appeal: any) => {
        const result = { ...appeal };
        
        // 仅为超级管理员提供证件号码
        if (isSuperAdmin(session) && appeal.idNumber) {
          try {
            // 尝试解密证件号码
            result.idNumber = decryptIdCard(appeal.idNumber);
          } catch (error) {
            console.error(`解密证件号码失败 (申诉ID: ${appeal.id}):`, error);
            result.idNumber = appeal.idNumber; // 解密失败时使用原始值
          }
        } else {
          // 非超级管理员不能看到证件相关敏感字段
          delete result.idNumber;
          delete result.idNumberHash;
        }
        
        return result;
      });

      // Return paginated response
      return NextResponse.json({
        items: processedAppeals,
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
    const { customerName, idNumber, idCardType = IdCardType.CHINA_MAINLAND, reason, evidence, previousAppealId } = data;

    // 验证必填字段
    if (!customerName || !idNumber || !reason) {
      return NextResponse.json(
        { message: '创建申诉失败', details: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 只检查输入不为空，不再验证格式
    if (!idNumber.trim()) {
      return NextResponse.json(
        { message: '创建申诉失败', details: '证件号码不能为空' },
        { status: 400 }
      );
    }

    try {
      // 生成身份证号码哈希 (注意：同样适用于不同类型的证件)
      const idNumberHash = await generateIdNumberHash(idNumber, idCardType);

      // 检查是否已存在相同身份证号码的申诉
      const existingAppeal = await prisma.appeal.findFirst({
        where: { 
          idNumberHash,
          partnerId: Number(session.user.id) // 仅检查当前合作伙伴的申诉
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingAppeal) {
        // 如果是重新上诉，允许创建新的申诉
        if (previousAppealId && existingAppeal.id === parseInt(previousAppealId)) {
          const appeal = await prisma.appeal.create({
            data: {
              customerName,
              idNumber: encryptIdCard(idNumber), // 使用统一的加密方案
              idNumberHash,
              reason,
              evidence,
              partnerId: Number(session.user.id),
              status: AppealStatus.PENDING,
              previousAppealId: parseInt(previousAppealId),
              idCardType: idCardType as string,
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

          return NextResponse.json({
            id: appeal.id,
            customerName: appeal.customerName,
            status: appeal.status,
            createdAt: appeal.createdAt,
            updatedAt: appeal.updatedAt,
            partnerId: appeal.partnerId,
          });
        }

        return NextResponse.json(
          {
            message: '创建申诉失败',
            details: '您已经为该客户提交过申诉，请勿重复提交',
            code: 'DUPLICATE_APPEAL'
          },
          { status: 409 }
        );
      }

      // 创建申诉记录
      const appeal = await prisma.appeal.create({
        data: {
          customerName,
          idNumber: encryptIdCard(idNumber), // 使用统一的加密方案
          idNumberHash,
          reason,
          evidence,
          partnerId: Number(session.user.id),
          status: AppealStatus.PENDING,
          previousAppealId: previousAppealId ? parseInt(previousAppealId) : null,
          idCardType: idCardType as string,
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

      return NextResponse.json({
        id: appeal.id,
        customerName: appeal.customerName,
        status: appeal.status,
        createdAt: appeal.createdAt,
        updatedAt: appeal.updatedAt,
        partnerId: appeal.partnerId,
      });
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