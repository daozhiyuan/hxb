import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getSafeCustomersList } from "@/lib/prisma-helpers"

// 告诉 Next.js 这个路由是动态的
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const searchQuery = searchParams.get('search') || ''
  const sortBy = searchParams.get('sortBy') || 'registrationDate'
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
  const statusFilter = searchParams.get('status') || ''
  
  try {
    const where: any = {}
    
    // 仅PARTNER角色需要过滤自己的客户
    if (session.user.role === 'PARTNER') {
      where.registeredByPartnerId = session.user.id
    }
    
    if (searchQuery) {
      where.search = searchQuery
    }
    
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter
    }
    
    // 使用安全查询辅助函数获取客户列表
    try {
      console.log('尝试使用安全查询辅助函数获取客户列表...');
      const result = await getSafeCustomersList({
        page,
        pageSize,
        where,
        sortBy,
        sortOrder
      })
      
      console.log(`成功获取客户列表: ${Array.isArray(result.data) ? result.data.length : 0} 条记录`);
      return NextResponse.json(result)
    } catch (databaseError) {
      console.warn("使用查询辅助函数获取客户列表失败，尝试使用直接SQL查询:", databaseError)
      
      try {
        // 构建SQL WHERE条件
        let whereCondition = "WHERE 1=1";
        const params: any[] = [];
        
        // 添加合作伙伴过滤条件 - 将这个条件移到最前面确保始终应用
        if (session.user.role === 'PARTNER') {
          whereCondition += " AND registeredByPartnerId = ?";
          params.push(Number(session.user.id));
        }
        
        // 添加搜索条件
        if (searchQuery) {
          whereCondition += " AND (name LIKE ? OR companyName LIKE ?)";
          params.push(`%${searchQuery}%`, `%${searchQuery}%`);
        }
        
        // 添加状态过滤条件
        if (statusFilter && statusFilter !== 'ALL') {
          whereCondition += " AND status = ?";
          params.push(statusFilter);
        }
        
        // 验证排序字段
        const validSortFields = ['registrationDate', 'name', 'updatedAt', 'status', 'companyName', 'email'];
        const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'registrationDate';
        const actualSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
        
        console.log('执行直接SQL查询计数...');
        // 构建计数查询
        const countQuery = `SELECT COUNT(*) as total FROM customers ${whereCondition}`;
        console.log('计数查询:', countQuery, params);
        
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
        const total = Number((countResult as any)[0]?.total || 0);
        console.log('查询到总记录数:', total);
        
        // 计算分页
        const skip = (page - 1) * pageSize;
        
        // 构建数据查询
        const orderClause = `ORDER BY ${actualSortBy} ${actualSortOrder}`;
        const limitClause = `LIMIT ? OFFSET ?`;
        const dataQuery = `SELECT * FROM customers ${whereCondition} ${orderClause} ${limitClause}`;
        console.log('数据查询:', dataQuery, [...params, pageSize, skip]);
        
        // 执行查询
        const customers = await prisma.$queryRawUnsafe(dataQuery, ...params, pageSize, skip);
        console.log(`SQL查询成功返回 ${(customers as any[]).length} 条记录`);
        
        return NextResponse.json({
          data: customers || [],
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        });
      } catch (sqlError) {
        console.error("直接SQL查询也失败:", sqlError);
        
        // 尝试最简单的查询作为最后手段
        try {
          console.log('尝试最简单的查询作为最后手段...');
          // 确保强制应用合作伙伴筛选条件
          const whereCondition = session.user.role === 'PARTNER' 
            ? `WHERE registeredByPartnerId = ${Number(session.user.id)}` 
            : '';
            
          const simpleQuery = `SELECT * FROM customers ${whereCondition} ORDER BY registrationDate DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
          const customers = await prisma.$queryRawUnsafe(simpleQuery);
          
          // 获取总数
          const countQuery = `SELECT COUNT(*) as total FROM customers ${whereCondition}`;
          const countResult = await prisma.$queryRawUnsafe(countQuery);
          const total = Number((countResult as any)[0]?.total || 0);
          
          console.log(`简化查询成功返回 ${Array.isArray(customers) ? customers.length : 0} 条记录`);
          
          return NextResponse.json({
            data: customers || [],
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.ceil(total / pageSize)
            }
          });
        } catch (finalError) {
          console.error("所有查询方法都失败，返回空结果:", finalError);
          
          // 返回空结果作为最终后备方案
          return NextResponse.json({
            data: [],
            pagination: {
              page,
              pageSize,
              total: 0,
              totalPages: 0
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("获取客户列表失败:", error)
    // 返回空结果作为后备方案
    return NextResponse.json({
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0
      },
      error: '获取客户列表失败，请联系管理员'
    });
  }
}