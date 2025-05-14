import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSafeCustomerFollowUps, safeCreateFollowUp } from '@/lib/prisma-helpers';

export const dynamic = 'force-dynamic';

/**
 * 获取客户跟进记录
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const customerId = parseInt(params.id);
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    // 使用安全查询辅助函数获取跟进记录
    const result = await getSafeCustomerFollowUps({
      customerId,
      page,
      pageSize
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('获取跟进记录失败:', error);
    return NextResponse.json({ error: '获取跟进记录失败' }, { status: 500 });
  }
}

/**
 * 创建客户跟进记录
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    console.log('会话状态:', {
      hasSession: !!session,
      user: session?.user ? {
        id: session.user.id,
        idType: typeof session.user.id,
        role: session.user.role
      } : 'null'
    });

    if (!session) {
      console.error('创建跟进记录失败: 用户未授权');
      return NextResponse.json({ error: '未授权', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    console.log(`尝试添加跟进记录: 客户ID=${params.id}, 用户ID=${session.user?.id}, 用户角色=${session.user?.role}`);
    
    const customerId = parseInt(params.id, 10);
    
    if (isNaN(customerId)) {
      console.error(`无效的客户ID: ${params.id}`);
      return NextResponse.json({ error: '无效的客户ID', code: 'INVALID_ID' }, { status: 400 });
    }
    
    // 记录请求体内容
    let body;
    try {
      body = await request.json();
      console.log('收到的跟进记录数据:', body);
    } catch (parseError) {
      console.error('解析请求体失败:', parseError);
      return NextResponse.json({ error: '无效的请求格式', code: 'INVALID_FORMAT' }, { status: 400 });
    }
    
    const { content, type, createdById: frontendUserId } = body;
    
    if (!content) {
      console.error('跟进内容为空');
      return NextResponse.json({ error: '跟进内容不能为空', code: 'CONTENT_REQUIRED' }, { status: 400 });
    }
    
    // 获取用户ID，优先使用前端传递的ID，其次从会话中获取，最后使用默认值
    let userId = frontendUserId || session.user?.id;
    
    // 会话中没有用户ID，这是一个异常情况，但我们可以使用默认值来恢复
    if (!userId && process.env.NODE_ENV === 'development') {
      console.warn('会话中没有用户ID，使用开发环境默认值1');
      userId = 1; // 在开发环境中使用默认ID 1
    }
    
    console.log(`用户ID信息: 前端传递=${frontendUserId}, 会话=${session.user?.id}, 最终使用=${userId}, 类型=${typeof userId}`);
    
    // 确保userId为数字类型
    if (typeof userId === 'string') {
      userId = parseInt(userId, 10);
    }
    
    if (!userId || isNaN(Number(userId))) {
      console.error(`用户ID无效: ${userId}`);
      return NextResponse.json({ error: '用户ID无效', code: 'INVALID_USER_ID' }, { status: 400 });
    }
    
    // 使用安全查询辅助函数创建跟进记录
    console.log(`尝试创建跟进记录: 客户ID=${customerId}, 用户ID=${userId}, 内容长度=${content.length}, 类型=${type}`);
    const followUp = await safeCreateFollowUp({
      customerId,
      content,
      createdById: userId,
      type
    });
    
    if (!followUp) {
      console.error(`创建跟进记录失败: 客户ID=${customerId}`);
      return NextResponse.json({ error: '创建跟进记录失败', code: 'CREATION_FAILED' }, { status: 500 });
    }
    
    console.log(`成功创建跟进记录: ID=${followUp.id}, 客户ID=${customerId}`);
    return NextResponse.json(followUp);
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ 
      error: '创建跟进记录失败', 
      message: errorMessage,
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
} 