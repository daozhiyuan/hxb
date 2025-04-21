'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// --- Helper Function to escape CSV fields (Copied from customer export) ---
const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

// --- API Handler for Partner Export ---
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check Authentication and Authorization (ADMIN only)
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Fetch all partners
    const partners = await prisma.user.findMany({
      where: {
        role: 'PARTNER', // Filter for partners only
      },
      select: { // Select fields needed for export
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Exclude passwordHash!
      },
      orderBy: {
        createdAt: 'asc', // Order by creation date for consistency
      },
    });

    // 3. Prepare CSV Data
    const headers = [
      'ID',
      '名称',
      '邮箱',
      '是否启用',
      '注册日期',
      '最后更新日期'
    ];

    const rows = partners.map(partner => {
        return [
            partner.id,
            partner.name,
            partner.email,
            partner.isActive ? '是' : '否',
            partner.createdAt.toISOString(),
            partner.updatedAt.toISOString()
        ].map(escapeCsvField); // Escape each field
    });

    // Combine headers and rows into CSV string
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // 4. Set Response Headers for CSV Download
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    responseHeaders.set('Content-Disposition', `attachment; filename="partners_export_${new Date().toISOString().split('T')[0]}.csv"`);

    // 5. Return CSV Content
    return new NextResponse(BOM + csvContent, {
        status: 200,
        headers: responseHeaders,
    });

  } catch (error) {
    console.error('导出合作伙伴数据 API (Admin) 出错:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}

