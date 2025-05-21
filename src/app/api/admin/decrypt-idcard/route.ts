import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// 移除Prisma导入
// import { Role } from '@prisma/client';
import { decryptIdCard } from '@/lib/encryption';

// 定义Role枚举替代Prisma导入
enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  PARTNER = 'PARTNER'
}

// 设置为动态路由以确保每次请求都获取最新数据
export const dynamic = 'force-dynamic';

// 检查用户是否为超级管理员
function isSuperAdmin(session: any) {
  return session?.user?.role === Role.SUPER_ADMIN;
}

/**
 * POST: 超级管理员专用的安全身份证号码解密API
 */
export async function POST(request: Request) {
  try {
    // 1. 获取会话并验证超级管理员权限
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: '需要超级管理员权限' }, { status: 403 });
    }
    
    // 2. 获取加密数据
    const data = await request.json();
    const { encryptedText } = data;
    
    if (!encryptedText) {
      return NextResponse.json({ error: '未提供加密数据' }, { status: 400 });
    }
    
    // 3. 记录解密开始
    console.log(`超级管理员[${session.user.id}]请求解密数据，长度：${encryptedText.length}`);
    
    // 4. 解密数据
    try {
      const decryptedText = decryptIdCard(encryptedText);
      
      // 检查解密结果的合理性
      if (decryptedText.includes('解密失败') || decryptedText.includes('格式错误')) {
        return NextResponse.json({ 
          success: false, 
          error: decryptedText,
          original: encryptedText 
        });
      }
      
      // 返回成功的解密结果
      return NextResponse.json({ 
        success: true, 
        decryptedText
      });
    } catch (error: any) {
      console.error('解密过程发生错误:', error);
      return NextResponse.json({ 
        success: false, 
        error: `解密发生错误: ${error.message}`, 
        original: encryptedText 
      });
    }
  } catch (error: any) {
    console.error('解密API发生错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
} 