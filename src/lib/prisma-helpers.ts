import { PrismaClient } from '@prisma/client';
import { customers_status } from '@prisma/client';
import prisma from './prisma';
import { Prisma } from '@prisma/client';
import { CustomerStatusEnum } from '@/config/client-config';

/**
 * 创建安全查询，处理不存在的列或字段错误
 * 
 * @param queryFn 执行Prisma查询的函数
 * @returns 查询结果或错误
 */
export async function safeQuery<T>(queryFn: () => Promise<T>): Promise<{ data: T | null, error: Error | null }> {
  try {
    const result = await queryFn();
    return { data: result, error: null };
  } catch (error: any) {
    console.error('Prisma查询错误:', error);
    
    // 处理不存在列的错误
    if (error.code === 'P2022') {
      console.warn(`数据库中不存在列: ${error.meta?.column}，将返回null`);
      return { data: null, error };
    }
    
    return { data: null, error };
  }
}

/**
 * 安全获取客户列表，避免因字段不存在导致的错误
 */
export async function getSafeCustomersList(options: {
  page: number;
  pageSize: number;
  where: any;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  const { page, pageSize, where, sortBy, sortOrder } = options;

  // 验证排序字段是否有效，避免使用不存在的字段
  const validSortFields = ['registrationDate', 'name', 'updatedAt', 'status', 'companyName', 'email'];
  const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'registrationDate';
  const actualSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  
  try {
    // 使用直接SQL查询而非Prisma模型查询
    const skip = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = '';
    const params: any[] = [];
    
    // 添加合作伙伴ID筛选条件
    if (where.registeredByPartnerId) {
      whereClause = ' WHERE registeredByPartnerId = ? ';
      params.push(where.registeredByPartnerId);
    }
    
    if (where.search) {
      if (whereClause) {
        whereClause += ' AND (name LIKE ? OR companyName LIKE ?) ';
      } else {
        whereClause = ' WHERE (name LIKE ? OR companyName LIKE ?) ';
      }
      const searchParam = `%${where.search}%`;
      params.push(searchParam, searchParam);
    }
    
    if (where.status && where.status !== 'ALL') {
      if (whereClause) {
        whereClause += ' AND status = ? ';
      } else {
        whereClause = ' WHERE status = ? ';
      }
      params.push(where.status);
    }
    
    // 执行计数查询
    const countQuery = `SELECT COUNT(*) as total FROM customers${whereClause}`;
    const countResult = await prisma.$queryRawUnsafe<[{total: number}]>(countQuery, ...params);
    const total = Number(countResult[0]?.total || 0);
    
    // 执行数据查询
    const orderClause = ` ORDER BY ${actualSortBy} ${actualSortOrder}`;
    const limitClause = ` LIMIT ? OFFSET ?`;
    const dataQuery = `SELECT * FROM customers${whereClause}${orderClause}${limitClause}`;
    const customers = await prisma.$queryRawUnsafe(dataQuery, ...params, pageSize, skip);
    
    // 批量解密证件号
    const { decryptIdCard } = await import('./encryption');
    const processedCustomers = (customers || []).map((customer: any) => ({
      ...customer,
      // 确保registrationDate存在
      registrationDate: customer.registrationDate || customer.createdAt || null,
      decryptedIdCardNumber: customer.idCardNumberEncrypted ? decryptIdCard(customer.idCardNumberEncrypted) : ''
    }));

    return {
      data: processedCustomers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    console.error('Prisma查询错误:', error);
    // 返回空结果
    return {
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0
      }
    };
  }
}

/**
 * 安全获取客户详情，避免因字段不存在导致的错误
 */
export async function getSafeCustomerDetails(customerId: number) {
  // 基本字段（已确认存在于数据库中）
  const basicFields = {
    id: true,
    name: true,
    companyName: true,
    phone: true,
    email: true,
    status: true,
    notes: true,
    registrationDate: true,
    updatedAt: true,
    jobTitle: true,
    address: true,
    idCardHash: true,
    idCardNumberEncrypted: true,
    lastYearRevenue: true,
    registeredByPartnerId: true,
  };

  // 尝试获取包含标签的客户
  const { data: customer } = await safeQuery(() => 
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        ...basicFields,
        // 标签关联（已确认可用）
        tags: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        // 注册人信息（已确认可用）
        registeredBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  );

  if (!customer) return null;

  // 单独查询跟进记录（如果出错则返回空数组）
  const { data: followUps } = await safeQuery(() => 
    prisma.followUp.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        content: true,
        createdAt: true,
        customerId: true,
        createdById: true,
        type: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  );

  // 合并结果
  return {
    ...(customer as {
      id: number;
      name: string;
      companyName: string | null;
      phone: string | null;
      email: string | null;
      status: string;
      notes: string | null;
      registrationDate: Date;
      updatedAt: Date;
      jobTitle: string | null;
      address: string | null;
      idCardHash: string | null;
      idCardNumberEncrypted: string | null;
      lastYearRevenue: number | null;
      registeredByPartnerId: number;
      idCardType?: string;
      tags?: any[];
      registeredBy?: any;
    }),
    followUps: followUps || []
  };
}

/**
 * 安全获取客户跟进记录，避免因字段不存在导致的错误
 */
export async function getSafeCustomerFollowUps(options: {
  customerId: number;
  page: number;
  pageSize: number;
}) {
  const { customerId, page, pageSize } = options;

  // 添加参数验证和日志记录
  if (!customerId || isNaN(Number(customerId))) {
    console.error(`[getSafeCustomerFollowUps] 无效的客户ID: ${customerId}`);
    return {
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        error: '无效的客户ID'
      }
    };
  }

  console.log(`[getSafeCustomerFollowUps] 获取客户ID ${customerId} 的跟进记录, 页码: ${page}, 每页数量: ${pageSize}`);

  try {
    // 获取跟进记录列表，只使用确认存在的字段
    const { data: followUps, error: followUpsError } = await safeQuery(() => 
      prisma.followUp.findMany({
        where: { customerId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
          customerId: true,
          createdById: true,
          type: true,
          // 不包含可能不存在的字段: notes, outcome, participants, sentiment, duration, location, attachments
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    );
    
    if (followUpsError) {
      console.error(`[getSafeCustomerFollowUps] 获取跟进记录失败: ${followUpsError.message}`, followUpsError);
    } else {
      console.log(`[getSafeCustomerFollowUps] 成功获取 ${followUps?.length || 0} 条跟进记录`);
    }

    // 获取总数
    const { data: total, error: totalError } = await safeQuery(() => 
      prisma.followUp.count({ where: { customerId } })
    );
    
    if (totalError) {
      console.error(`[getSafeCustomerFollowUps] 获取总数失败: ${totalError.message}`, totalError);
    }

    const totalPages = Math.ceil((total || 0) / pageSize);
    console.log(`[getSafeCustomerFollowUps] 总记录数: ${total || 0}, 总页数: ${totalPages}`);

    return {
      data: followUps || [],
      pagination: {
        page,
        pageSize,
        total: total || 0,
        totalPages
      }
    };
  } catch (error) {
    console.error(`[getSafeCustomerFollowUps] 处理跟进记录时发生异常:`, error);
    return {
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        error: '获取跟进记录时发生错误'
      }
    };
  }
}

/**
 * 安全创建客户跟进记录
 */
export async function safeCreateFollowUp(data: {
  customerId: number;
  content: string;
  createdById: number | string;
  type?: string;
}) {
  const { customerId, content, type = 'MEETING' } = data;
  // 确保createdById为整数类型
  const createdById = typeof data.createdById === 'string' 
    ? parseInt(data.createdById, 10) 
    : data.createdById;

  console.log(`[safeCreateFollowUp] 开始创建跟进记录: 客户ID=${customerId}, 用户ID=${createdById}, 内容长度=${content.length}, 类型=${type}`);

  // 验证参数
  if (!customerId || isNaN(Number(customerId))) {
    console.error(`[safeCreateFollowUp] 无效的客户ID: ${customerId}`);
    return null;
  }

  if (!createdById || isNaN(Number(createdById))) {
    console.error(`[safeCreateFollowUp] 无效的创建者ID: ${createdById}, 原始值: ${data.createdById}, 类型: ${typeof data.createdById}`);
    return null;
  }

  if (!content || typeof content !== 'string') {
    console.error(`[safeCreateFollowUp] 无效的跟进内容: ${content}, 类型: ${typeof content}`);
    return null;
  }

  try {
    console.log(`[safeCreateFollowUp] 参数验证通过，准备事务操作`);
    // 使用纯SQL方式创建记录，完全绕过Prisma模型的自动映射
    // 这是最安全的方法，可以避免模型与数据库不一致的问题
    const createdFollowUpId = await prisma.$transaction(async (tx) => {
      try {
        // Step 1: 插入记录
        console.log(`[safeCreateFollowUp] 执行SQL插入: (${content}, ${customerId}, ${createdById}, ${type})`);
        await tx.$executeRaw`
          INSERT INTO FollowUp (content, customerId, createdById, type, createdAt, duration)
          VALUES (${content}, ${customerId}, ${createdById}, ${type}, NOW(), 30);
        `;
        
        // Step 2: 获取插入的ID并确保转换为Number类型
        const result = await tx.$queryRaw<{id: number}[]>`
          SELECT CAST(LAST_INSERT_ID() AS SIGNED) as id;
        `;
        
        const id = Number(result[0].id);
        console.log(`[safeCreateFollowUp] 获取到新创建的记录ID: ${id}`);
        return id;
      } catch (txError) {
        console.error(`[safeCreateFollowUp] 事务执行失败:`, txError);
        throw txError; // 重新抛出错误以便事务回滚
      }
    });
    
    console.log(`[safeCreateFollowUp] 事务完成，跟进记录ID: ${createdFollowUpId}`);
    
    // 使用安全查询获取创建的记录
    const { data: followUp, error: queryError } = await safeQuery(() => 
      prisma.followUp.findUnique({
        where: { id: createdFollowUpId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          customerId: true,
          createdById: true,
          type: true,
          duration: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    );
    
    if (queryError) {
      console.error(`[safeCreateFollowUp] 查询创建的记录失败:`, queryError);
    }
    
    if (!followUp) {
      console.error(`[safeCreateFollowUp] 记录已创建(ID=${createdFollowUpId})但无法查询详情`);
      // 构造一个基本响应，确保客户端至少知道创建成功
      return {
        id: createdFollowUpId,
        content,
        customerId,
        createdById,
        type,
        createdAt: new Date().toISOString(),
        duration: 30
      };
    }
    
    console.log(`[safeCreateFollowUp] 成功完成: 返回完整记录，ID=${followUp.id}`);
    return followUp;
  } catch (error) {
    console.error('[safeCreateFollowUp] 创建跟进记录失败:', error);
    if (error instanceof Error) {
      console.error('[safeCreateFollowUp] 错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 安全地根据身份证哈希查找客户
export async function safeFindCustomerByIdCardHash(idCardHash: string) {
  try {
    // 使用Prisma模型查询
    const customer = await prisma.customer.findFirst({
      where: { idCardHash }
    });
    
    return { 
      success: true, 
      customer: customer ? { 
        id: customer.id, 
        registeredByPartnerId: customer.registeredByPartnerId 
      } : null 
    };
  } catch (error) {
    console.error('安全查找客户记录失败:', error);
    
    // 如果模型查询失败，尝试使用直接SQL查询
    try {
      const result = await prisma.$queryRaw<{id: number, registeredByPartnerId: number}[]>`
        SELECT id, registeredByPartnerId 
        FROM customers 
        WHERE idCardHash = ${idCardHash} 
        LIMIT 1;
      `;
      
      // 如果找到结果，返回第一条记录
      if (result && result.length > 0) {
        return { success: true, customer: result[0] };
      }
      
      // 未找到记录
      return { success: true, customer: null };
    } catch (sqlError) {
      console.error('SQL查询客户记录也失败:', sqlError);
      return { success: false, error: sqlError };
    }
  }
}

// 安全地检查客户是否重复
export async function safeCheckDuplicateCustomer(idCardHash: string) {
  try {
    // 使用Prisma模型查询
    const count = await prisma.customer.count({
      where: { idCardHash }
    });
    
    return { success: true, isDuplicate: count > 0 };
  } catch (error) {
    console.error('检查客户是否重复失败:', error);
    
    // 如果模型查询失败，尝试使用直接SQL查询
    try {
      const result = await prisma.$queryRaw<{count: number}[]>`
        SELECT COUNT(*) as count 
        FROM customers 
        WHERE idCardHash = ${idCardHash};
      `;
      
      // 获取计数结果
      const count = result[0]?.count || 0;
      return { success: true, isDuplicate: count > 0 };
    } catch (sqlError) {
      console.error('SQL检查客户是否重复也失败:', sqlError);
      return { success: false, error: sqlError, isDuplicate: false };
    }
  }
}

// 安全地创建客户记录的函数
export async function safeCreateCustomer(data: {
  name: string;
  idCardNumberEncrypted: string;
  idCardHash: string;
  registeredByPartnerId: number;
  idCardType?: string;
  companyName?: string | null;
  lastYearRevenue?: number | string | null;
  phone?: string | null;
  address?: string | null;
  status?: string | null;
  notes?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  source?: string | null;
  position?: string | null;
}) {
  try {
    // 处理lastYearRevenue，确保为数字或null
    let processedRevenue: number | null = null;
    if (data.lastYearRevenue !== undefined && data.lastYearRevenue !== null) {
      if (typeof data.lastYearRevenue === 'string') {
        if (data.lastYearRevenue !== '') {
          const parsed = parseFloat(data.lastYearRevenue);
          processedRevenue = isNaN(parsed) ? null : parsed;
        }
      } else {
        processedRevenue = data.lastYearRevenue;
      }
    }

    // 确保status是有效的枚举值
    const status = data.status && Object.values(CustomerStatusEnum).includes(data.status as any) 
      ? data.status 
      : CustomerStatusEnum.FOLLOWING;

    // 直接使用Prisma创建
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        idCardNumberEncrypted: data.idCardNumberEncrypted,
        idCardHash: data.idCardHash,
        registeredByPartnerId: data.registeredByPartnerId,
        idCardType: data.idCardType || 'CHINA_MAINLAND',
        companyName: data.companyName || null,
        lastYearRevenue: processedRevenue,
        phone: data.phone || null,
        address: data.address || null,
        status: status as customers_status,
        notes: data.notes || null,
        jobTitle: data.jobTitle || null,
        industry: data.industry || null,
        source: data.source || null,
        position: data.position || null,
      }
    });
    
    return { 
      success: true, 
      customer: { 
        id: customer.id,
        name: customer.name,
        registeredByPartnerId: customer.registeredByPartnerId
      } 
    };
  } catch (error) {
    console.error('安全创建客户记录失败:', error);
    
    // 失败后返回错误
    return { success: false, error };
  }
} 