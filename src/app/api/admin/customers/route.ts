
'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for types

// GET handler to fetch ALL customers for ADMIN users with pagination and search
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check Auth
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Get parameters from URL query
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const searchQuery = searchParams.get('searchQuery') || '';

    // 3. Validate pagination params
    const currentPage = Math.max(1, page);
    const currentPageSize = Math.max(5, Math.min(50, pageSize));
    const skip = (currentPage - 1) * currentPageSize;

    // 4. Construct WHERE clause for search
    const whereClause: Prisma.CustomerWhereInput = {};
    if (searchQuery) {
      whereClause.OR = [
        { 
            name: { 
                contains: searchQuery, 
                mode: 'insensitive' // Case-insensitive search (adjust if DB doesn't support)
            } 
        },
          {
              companyName: {
                  contains: searchQuery,
                  mode: 'insensitive'
              }
          },
        { 
            registeredBy: {
                OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { email: { contains: searchQuery, mode: 'insensitive' } },
                ]
            }
        },
        // Add other fields to search if needed, e.g., phone
        // { phone: { contains: searchQuery } }
      ];
    }

    // 5. Fetch data and count with WHERE clause
    const [customers, totalCount] = await prisma.$transaction([
        prisma.customer.findMany({
            where: whereClause, // Apply the search filter
            skip: skip,
            take: currentPageSize,
            select: {
                id: true,
                name: true,
                companyName: true,
                lastYearRevenue: true,
                phone: true,
                address: true,
                status: true,
                notes: true,
                registrationDate: true,
                updatedAt: true,
                registeredBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
            },
            orderBy: {
                registrationDate: 'desc',
            },
        }),
        prisma.customer.count({ where: whereClause }) // Apply the same filter to count
    ]);

    // 6. Calculate total pages
    const totalPages = Math.ceil(totalCount / currentPageSize);

    // 7. Return Response
    return NextResponse.json(
        {
            data: customers,
            pagination: {
                page: currentPage,
                pageSize: currentPageSize,
                totalCount: totalCount,
                totalPages: totalPages,
            }
        },
        { status: 200 }
    );

  } catch (error) {
    console.error('获取所有客户列表 API (Admin) 出错:', error);
    // Add specific error handling if needed (e.g., for invalid search query format)
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
