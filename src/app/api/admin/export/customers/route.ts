import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { CustomerStatusEnum } from '@/config/client-config';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { isAdmin } from '@/lib/auth-helpers';

// 导入API配置
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // 构建查询条件
    const where: any = {};
    
    // 角色访问限制 - 非管理员只能看到自己的客户
    if (!isAdmin(session)) {
      where.partnerId = session.user.id;
    }
    
    // 添加状态过滤
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    // 添加搜索条件
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    // 获取客户数据
    const customers = await prisma.customer.findMany({
      where,
      include: {
        partner: {
          select: {
            name: true,
            email: true,
          },
        },
        tags: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 生成CSV内容
    const csvHeaders = [
      'ID',
      '姓名',
      '电话',
      '邮箱',
      '状态',
      '职位',
      '地址',
      '备注',
      '创建时间',
      '最后更新',
      '负责人',
      '标签'
    ].join(',');

    const rows = customers.map((customer: any) => {
      // 状态映射
      const statusMap: Record<string, string> = {
        FOLLOWING: '跟进中',
        NEGOTIATING: '洽谈中',
        PENDING: '待定',
        SIGNED: '已签约',
        COMPLETED: '已完成',
        LOST: '已流失'
      };

      // 将标签列表转换为逗号分隔的字符串
      const tagsString = customer.tags
        ? customer.tags.map((t: any) => t.name).join('|')
        : '';

      // 转义需要包含在引号中的内容(包含逗号、引号或换行符的字段)
      const escapeCsvField = (value: string) => {
        if (!value) return '';
        // 如果字段包含逗号、引号或换行符，则需要用引号包裹并将内部引号双写
        if (/[",\n\r]/.test(value)) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      return [
        customer.id,
        escapeCsvField(customer.name || ''),
        escapeCsvField(customer.phone || ''),
        escapeCsvField(customer.email || ''),
        statusMap[customer.status] || customer.status,
        escapeCsvField(customer.jobTitle || ''),
        escapeCsvField(customer.address || ''),
        escapeCsvField(customer.notes || ''),
        format(new Date(customer.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
        format(new Date(customer.updatedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
        escapeCsvField(customer.partner?.name || ''),
        escapeCsvField(tagsString)
      ].join(',');
    });

    // 将CSV头和行组合成完整的CSV内容
    let csvContent = [csvHeaders, ...rows].join('\n');
    
    // 添加UTF-8 BOM标记，解决Excel打开中文乱码问题
    const UTF8_BOM = '\uFEFF';
    csvContent = UTF8_BOM + csvContent;

    // 设置响应头
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    
    // 使用RFC 5987编码处理中文文件名
    const fileName = `customers_${format(new Date(), 'yyyy-MM-dd', { locale: zhCN })}.csv`;
    const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape);
    responseHeaders.set('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('导出客户数据失败:', error);
    return NextResponse.json({ message: '导出失败', error: String(error) }, { status: 500 });
  }
} 