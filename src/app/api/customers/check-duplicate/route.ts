import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';
import { safeCheckDuplicateCustomer } from '@/lib/prisma-helpers';

// 设置为动态路由
export const dynamic = 'force-dynamic';

// 哈希函数，使用SHA-256哈希身份证号码
const hashIdCard = (idCardNumber: string): string => {
  try {
    // 创建哈希
    const hash = crypto.createHash('sha256');
    hash.update(idCardNumber);
    
    // 返回哈希结果的十六进制表示
    return hash.digest('hex');
  } catch (error) {
    console.error('哈希身份证号码失败:', error);
    // 如果哈希失败，回退到简化版哈希（生产环境应该抛出错误）
    return `hash_${idCardNumber.substring(idCardNumber.length - 3)}`;
  }
};

// 检查客户是否重复
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 验证授权
    if (!session || !session.user) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 });
    }

    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const idNumber = searchParams.get('idNumber');

    if (!idNumber) {
      return NextResponse.json({ message: '缺少身份证号码参数' }, { status: 400 });
    }

    // 哈希身份证号
    const idCardHash = hashIdCard(idNumber);

    // 安全查询是否重复
    const result = await safeCheckDuplicateCustomer(idCardHash);

    if (!result.success) {
      console.error('查重失败:', result.error);
      return NextResponse.json({ message: '查重失败，请稍后重试' }, { status: 500 });
    }

    // 返回查重结果
    return NextResponse.json({ isDuplicate: result.isDuplicate });

  } catch (error) {
    console.error('查重失败:', error);
    return NextResponse.json({ message: '查重失败，请稍后重试' }, { status: 500 });
  }
} 