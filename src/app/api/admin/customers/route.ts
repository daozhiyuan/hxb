import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin, isSuperAdmin } from '@/lib/auth-helpers';
import { decryptIdCard, isValidEncryptedFormat } from '@/lib/encryption';

// 设置为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    
    // 检查管理员权限
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ message: '需要管理员权限' }, { status: 403 });
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const searchQuery = searchParams.get('searchQuery') || '';
    
    // 验证分页参数
    if (isNaN(page) || isNaN(pageSize) || page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ message: '无效的分页参数' }, { status: 400 });
    }
    
    // 构建搜索条件
    const where = searchQuery ? {
      OR: [
        { name: { contains: searchQuery } },
        { companyName: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { phone: { contains: searchQuery } },
        {
          registeredBy: {
            OR: [
              { name: { contains: searchQuery } },
              { email: { contains: searchQuery } }
            ]
          }
        }
      ]
    } : {};
    
    // 获取总数
    const totalCount = await prisma.customer.count({ where });
    
    // 计算总页数
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // 获取客户列表
    const customers = await prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        registeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    // 为超级管理员解密证件号码
    const processedCustomers = await Promise.all(customers.map(async (customer) => {
      let processedCustomer = { ...customer };
      let decryptedIdCardNumber = '';
      if (isSuperAdmin(session) && customer.idCardNumberEncrypted) {
        try {
          decryptedIdCardNumber = decryptIdCard(customer.idCardNumberEncrypted);
          if (
            decryptedIdCardNumber.includes('解密失败') ||
            decryptedIdCardNumber.includes('格式错误') ||
            decryptedIdCardNumber.includes('无效')
          ) {
            decryptedIdCardNumber = '[解密失败]';
          }
        } catch (decryptError) {
          console.error('解密过程发生异常:', decryptError);
          decryptedIdCardNumber = '[解密失败]';
        }
      }
      processedCustomer.decryptedIdCardNumber = decryptedIdCardNumber;
      return processedCustomer;
    }));
    
    // 返回分页结果
    return NextResponse.json({
      data: processedCustomers,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      }
    });
  } catch (error) {
    console.error('获取管理员客户列表失败:', error);
    return NextResponse.json(
      { message: '获取管理员客户列表失败', error: String(error) },
      { status: 500 }
    );
  }
} 