import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role, AppealStatus } from '@prisma/client';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 导入API配置
export { dynamic, runtime, fetchCache, revalidate, dynamicParams } from '../../config';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search');

    // 构建查询条件
    // 使用类型断言，指定where参数类型
    const where: any = {};
    
    // 根据用户角色添加查询条件
    if (session.user.role !== Role.ADMIN) {
      where.partnerId = session.user.id;
    }
    
    // 添加状态过滤
    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as AppealStatus;
    }
    
    // 添加搜索条件
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { reason: { contains: search } }
      ];
    }

    // 获取申诉数据
    const appeals = await prisma.appeal.findMany({
      where,
      include: {
        partner: {
          select: {
            name: true,
            email: true,
          },
        },
        operator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 生成CSV内容
    const csvHeaders = [
      'ID',
      '客户姓名',
      '申诉原因',
      '状态',
      '提交时间',
      '提交人',
      '处理人',
      '处理时间',
      '备注'
    ].join(',');

    const rows = appeals.map(appeal => {
      const statusMap: Record<AppealStatus, string> = {
        [AppealStatus.PENDING]: '待处理',
        [AppealStatus.PROCESSING]: '处理中',
        [AppealStatus.APPROVED]: '已通过',
        [AppealStatus.REJECTED]: '已驳回'
      };

      return [
        appeal.id,
        appeal.customerName,
        `"${appeal.reason.replace(/"/g, '""')}"`,
        statusMap[appeal.status],
        format(new Date(appeal.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
        appeal.partner.name,
        appeal.operator?.name || '-',
        appeal.processedAt ? format(new Date(appeal.processedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) : '-',
        `"${(appeal.remarks || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [csvHeaders, ...rows].join('\n');

    // 设置响应头
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    responseHeaders.set('Content-Disposition', 'attachment; filename=appeals.csv');

    return new NextResponse(csvContent, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('导出申诉数据失败:', error);
    return NextResponse.json({ message: '导出失败' }, { status: 500 });
  }
} 