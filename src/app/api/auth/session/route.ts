/**
 * 会话修复API
 * 处理会话更新和修复的服务端逻辑
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// 确保此路由是动态的，不会被缓存
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET方法处理会话查询请求
export async function GET(request: NextRequest) {
  try {
    // 获取当前会话
    const session = await getServerSession(authOptions);
    
    // 如果没有会话，返回空对象（符合NextAuth期望）
    if (!session) {
      return NextResponse.json({});
    }
    
    // 返回会话信息
    return NextResponse.json({
      user: session.user,
      expires: session.expires
    });
  } catch (error) {
    console.error('[Session API] 处理会话请求时出错:', error);
    
    // 出错时返回空对象（符合NextAuth期望）
    return NextResponse.json({});
  }
}

// POST方法处理会话修复请求
export async function POST(request: NextRequest) {
  try {
    // 获取当前会话
    const session = await getServerSession(authOptions);
    
    // 如果没有会话，返回未授权
    if (!session) {
      return NextResponse.json(
        { error: '未授权，无法修复会话' },
        { status: 401 }
      );
    }
    
    // 验证用户ID是否有效
    const userId = session.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: '会话损坏，需要重新登录',
          message: '会话中的用户ID缺失，无法修复会话'
        },
        { status: 403 }
      );
    }
    
    // 返回更新后的会话信息
    return NextResponse.json({
      user: session.user,
      status: 'authenticated',
      message: '会话已更新'
    });
  } catch (error) {
    console.error('[Session API] 处理会话修复请求时出错:', error);
    
    return NextResponse.json(
      { 
        error: '会话更新失败',
        message: '处理会话修复请求时发生错误'
      },
      { status: 500 }
    );
  }
} 