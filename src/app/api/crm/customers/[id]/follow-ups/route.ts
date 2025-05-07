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

    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const customerId = parseInt(params.id, 10);
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { content, type } = body;
    
    if (!content) {
      return NextResponse.json({ error: '跟进内容不能为空' }, { status: 400 });
    }
    
    // 使用安全查询辅助函数创建跟进记录
    const followUp = await safeCreateFollowUp({
      customerId,
      content,
      createdById: typeof session.user.id === 'string' ? parseInt(session.user.id, 10) : session.user.id,
      type
    });
    
    if (!followUp) {
      return NextResponse.json({ error: '创建跟进记录失败' }, { status: 500 });
    }
    
    return NextResponse.json(followUp);
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    return NextResponse.json({ error: '创建跟进记录失败' }, { status: 500 });
  }
} 