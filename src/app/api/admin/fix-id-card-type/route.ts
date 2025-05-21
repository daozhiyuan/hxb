import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdmin } from '@/lib/auth-helpers';
import { 
  successResponse, 
  unauthorizedResponse, 
  forbiddenResponse, 
  serverErrorResponse 
} from '@/lib/api-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 修复历史数据中idCardType为NULL或空的记录
 * 仅限超级管理员访问
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 权限检查 - 仅允许超级管理员执行此操作
    if (!session || !session.user) {
      return unauthorizedResponse();
    }
    
    if (!isSuperAdmin(session)) {
      return forbiddenResponse('仅超级管理员可执行此操作');
    }
    
    // 开始修复数据
    console.log('开始修复历史数据中的证件类型...');
    
    // 修复customers表
    const customersResult = await prisma.$executeRaw`
      UPDATE customers 
      SET idCardType = 'CHINA_MAINLAND' 
      WHERE idCardType IS NULL OR idCardType = ''
    `;
    
    // 修复Appeal表
    const appealsResult = await prisma.$executeRaw`
      UPDATE Appeal 
      SET idCardType = 'CHINA_MAINLAND' 
      WHERE idCardType IS NULL OR idCardType = ''
    `;
    
    console.log(`成功修复 ${customersResult} 条客户数据`);
    console.log(`成功修复 ${appealsResult} 条申诉数据`);
    
    return successResponse({
      success: true,
      customersFixed: Number(customersResult),
      appealsFixed: Number(appealsResult),
      totalFixed: Number(customersResult) + Number(appealsResult),
      message: '历史数据证件类型修复完成'
    });
    
  } catch (error) {
    console.error('修复历史数据失败:', error);
    return serverErrorResponse(error);
  }
} 