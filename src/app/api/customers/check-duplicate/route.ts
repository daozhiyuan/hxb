import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { safeCheckDuplicateCustomer } from '@/lib/prisma-helpers';
import { IdCardType } from '@/lib/client-validation';
import { hashIdCard } from '@/lib/encryption';

// 设置为动态路由
export const dynamic = 'force-dynamic';

// 检查客户是否重复
export async function GET(request: Request) {
  try {
    console.log('[check-duplicate] 开始处理查重请求');
    const session = await getServerSession(authOptions);

    // 验证授权
    if (!session || !session.user) {
      console.log('[check-duplicate] 授权失败: 未登录用户');
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const idNumber = searchParams.get('idNumber');
    const idCardType = searchParams.get('idCardType') || IdCardType.CHINA_MAINLAND;

    console.log(`[check-duplicate] 查重参数: 证件类型=${idCardType}, 证件号码长度=${idNumber ? idNumber.length : 0}`);

    if (!idNumber) {
      console.log('[check-duplicate] 错误: 缺少证件号码参数');
      return NextResponse.json({ 
        message: '缺少证件号码参数',
        details: '必须提供证件号码才能进行查重'
      }, { status: 400 });
    }

    // 使用统一的hashIdCard函数进行哈希
    const idNumberHash = hashIdCard(idNumber, idCardType);
    console.log(`[check-duplicate] 生成哈希值完成, 前几位: ${idNumberHash.substring(0, 8)}...`);

    // 安全查询是否重复
    const result = await safeCheckDuplicateCustomer(idNumberHash);
    console.log(`[check-duplicate] 查重结果: 成功=${result.success}, 是否重复=${result.isDuplicate}`);

    if (!result.success) {
      console.error('[check-duplicate] 查重失败:', result.error);
      return NextResponse.json({ 
        message: '查重失败，请稍后重试',
        details: '数据库查询错误'
      }, { status: 500 });
    }

    // 返回查重结果
    console.log('[check-duplicate] 成功返回查重结果');
    return NextResponse.json({ 
      isDuplicate: result.isDuplicate,
      message: result.isDuplicate ? '证件号码已存在' : '证件号码可用'
    });

  } catch (error) {
    console.error('[check-duplicate] 查重过程中发生严重错误:', error);
    // 提供更有用的错误信息
    let errorMessage = '查重失败，请稍后重试';
    let errorDetails = '服务器内部错误';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      console.error('[check-duplicate] 错误详情:', error.stack);
    }
    
    return NextResponse.json({ 
      message: errorMessage,
      details: errorDetails,
      success: false
    }, { status: 500 });
  }
} 