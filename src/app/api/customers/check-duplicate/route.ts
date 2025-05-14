import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';
import { safeCheckDuplicateCustomer } from '@/lib/prisma-helpers';
import { IdCardType } from '@/lib/client-validation';

// 设置为动态路由
export const dynamic = 'force-dynamic';

// 哈希函数，使用SHA-256哈希证件号码
const hashIdCard = (idCardNumber: string, idCardType: string = IdCardType.CHINA_MAINLAND): string => {
  try {
    // 输入验证
    if (!idCardNumber || typeof idCardNumber !== 'string') {
      console.error('[hashIdCard] 证件号码无效:', idCardNumber);
      return `invalid_${Date.now().toString()}`;
    }

    // 去除输入中的空格和特殊字符
    const cleanedNumber = idCardNumber.trim();
    
    // 记录哈希计算信息，不包含敏感数据
    console.log(`[hashIdCard] 计算哈希: 类型=${idCardType}, 长度=${cleanedNumber.length}, 前三位=${cleanedNumber.substring(0, Math.min(3, cleanedNumber.length))}`);
    
    // 创建哈希，加入证件类型作为前缀，确保不同证件类型的相同号码产生不同哈希
    const hash = crypto.createHash('sha256');
    hash.update(`${idCardType || IdCardType.CHINA_MAINLAND}:${cleanedNumber}`);
    
    // 返回哈希结果的十六进制表示
    const result = hash.digest('hex');
    console.log(`[hashIdCard] 哈希计算成功, 结果前几位: ${result.substring(0, 8)}...`);
    return result;
  } catch (error) {
    console.error('[hashIdCard] 哈希证件号码失败:', error);
    
    // 安全的回退处理
    try {
      // 确保idCardNumber至少有1个字符
      const safeNumber = idCardNumber && typeof idCardNumber === 'string' ? idCardNumber : 'invalid';
      const safeType = idCardType || IdCardType.CHINA_MAINLAND;
      
      // 生成唯一标识，使用证件类型前缀、证件号码的前三个字符（如果有）以及时间戳
      const prefix = safeNumber.substring(0, Math.min(3, safeNumber.length));
      const fallbackHash = `hash_${safeType}_${prefix}_${Date.now().toString()}`;
      
      console.log(`[hashIdCard] 使用回退哈希: ${fallbackHash.substring(0, 15)}...`);
      return fallbackHash;
    } catch (backupError) {
      console.error('[hashIdCard] 生成备用哈希也失败:', backupError);
      // 最后的回退方案：使用时间戳确保唯一性
      const emergencyHash = `emergency_hash_${Date.now().toString()}`;
      console.log(`[hashIdCard] 使用紧急哈希: ${emergencyHash}`);
      return emergencyHash;
    }
  }
};

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

    // 哈希证件号
    const idCardHash = hashIdCard(idNumber, idCardType);
    console.log(`[check-duplicate] 生成哈希值完成, 前几位: ${idCardHash.substring(0, 8)}...`);

    // 安全查询是否重复
    const result = await safeCheckDuplicateCustomer(idCardHash);
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