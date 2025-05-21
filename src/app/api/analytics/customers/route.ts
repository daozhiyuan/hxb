import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth-helpers';
import { CustomerStatusEnum } from '@/config/client-config';

// 设置为动态路由
export const dynamic = 'force-dynamic';

/**
 * 获取客户分析数据
 * - 普通用户(PARTNER)只能分析自己的客户数据
 * - 管理员(ADMIN/SUPER_ADMIN)可以分析所有客户数据
 */
export async function GET(request: Request) {
  try {
    // 验证会话和权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
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

    // 根据用户角色应用不同的过滤条件
    const isAdminUser = isAdmin(session);
    
    // 构建查询条件
    const whereCondition = isAdminUser 
      ? { 
          createdAt: { gte: startDate } 
        } 
      : { 
          AND: [
            { partnerId: session.user.id },
            { createdAt: { gte: startDate } }
          ]
        };

    // 获取分析数据
    const [
      totalCustomers,
      newCustomers,
    ] = await Promise.all([
      // 总客户数
      prisma.customer.count({
        where: isAdminUser ? {} : { partnerId: session.user.id }
      }),
      
      // 新增客户数
      prisma.customer.count({
        where: whereCondition
      }),
    ]);
    
    // 获取状态统计数据
    const statusStatistics: Record<string, number> = {};
    
    // 获取所有可能的状态值
    const allStatuses = Object.values(CustomerStatusEnum);
    
    // 对每个状态单独进行查询
    for (const status of allStatuses) {
      const count = await prisma.customer.count({
        where: {
          ...isAdminUser ? {} : { partnerId: session.user.id },
          status
        }
      });
      
      statusStatistics[status] = count;
    }

    // 返回分析结果
    return NextResponse.json({
      totalCustomers,
      newCustomers,
      statusStatistics,
      period,
      isAdminView: isAdminUser
    });
  } catch (error) {
    console.error('获取客户分析数据失败:', error);
    return NextResponse.json(
      { message: '获取分析数据失败', error: String(error) }, 
      { status: 500 }
    );
  }
} 