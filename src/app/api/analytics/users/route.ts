import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';

// 设置为动态路由
export const dynamic = 'force-dynamic';

/**
 * 获取用户分析数据
 * - 仅管理员(ADMIN/SUPER_ADMIN)可以访问此端点
 */
export async function GET(request: Request) {
  try {
    // 验证会话和权限
    const session = await getServerSession(authOptions);
    
    // 检查是否有管理员权限
    if (!isAdmin(session)) {
      return NextResponse.json({ message: '未授权访问，需要管理员权限' }, { status: 403 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // 默认分析周期：month, quarter, year

    // 确定时间范围
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      default: // month
        startDate.setMonth(now.getMonth() - 1);
    }

    // 获取用户分析数据
    const [
      totalPartners,
      newPartners,
      activePartners,
      inactivePartners,
    ] = await Promise.all([
      // 总合作伙伴数
      prisma.user.count({
        where: { role: 'PARTNER' }
      }),
      
      // 新增合作伙伴数
      prisma.user.count({
        where: {
          role: 'PARTNER',
          createdAt: { gte: startDate }
        }
      }),
      
      // 活跃合作伙伴数
      prisma.user.count({
        where: {
          role: 'PARTNER',
          isActive: true
        }
      }),
      
      // 不活跃合作伙伴数
      prisma.user.count({
        where: {
          role: 'PARTNER',
          isActive: false
        }
      }),
    ]);

    // 定义合作伙伴数据类型
    interface PartnerWithCustomerCount {
      id: number;
      name: string | null;
      email: string;
      _count: {
        customers: number;
      };
    }

    // 获取合作伙伴和他们的客户数量
    const partners = await prisma.user.findMany({
      where: {
        role: 'PARTNER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            customers: true
          }
        }
      },
      orderBy: {
        customers: {
          _count: 'desc'
        }
      },
      take: 10 // 仅返回前10名活跃合作伙伴
    });

    // 组装前10名合作伙伴数据
    const topPartnersWithDetails = partners.map((partner: PartnerWithCustomerCount) => ({
      id: partner.id,
      name: partner.name || '未知',
      email: partner.email,
      customerCount: partner._count.customers
    }));

    // 返回分析结果
    return NextResponse.json({
      totalPartners,
      newPartners,
      activePartners,
      inactivePartners,
      topPartners: topPartnersWithDetails,
      period
    });
  } catch (error) {
    console.error('获取用户分析数据失败:', error);
    return NextResponse.json(
      { message: '获取分析数据失败', error: String(error) }, 
      { status: 500 }
    );
  }
} 