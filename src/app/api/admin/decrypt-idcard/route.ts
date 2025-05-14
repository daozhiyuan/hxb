import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import crypto from 'crypto';

// 常量定义
const IV_LENGTH = 16;

// 设置为动态路由以确保每次请求都获取最新数据
export const dynamic = 'force-dynamic';

// 从环境变量获取加密密钥
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY 环境变量未设置');
  }
  
  // 处理Key为不同格式的情况
  if (key.match(/^[A-Za-z0-9+/=]+$/) && key.length % 4 === 0) {
    // Base64格式
    const keyBuffer = Buffer.from(key, 'base64');
    if (keyBuffer.length === 32) return keyBuffer;
    
    // 如果解码后不是32字节，调整大小
    const adjustedBuffer = Buffer.alloc(32);
    keyBuffer.copy(adjustedBuffer);
    return adjustedBuffer;
  } else {
    // 文本格式，确保是32字节
    let keyText = key;
    if (key.length < 32) {
      keyText = key.padEnd(32, key);
    } else if (key.length > 32) {
      keyText = key.substring(0, 32);
    }
    return Buffer.from(keyText);
  }
};

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
      // 移除直接返回安全值的检查，使所有数据都尝试解密
      const decryptedText = decryptSecureIdCard(encryptedText);
      
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

/**
 * 增强版的身份证号码解密函数，能处理多种格式
 */
function decryptSecureIdCard(text: string): string {
  try {
    if (!text) return '加密数据为空';
    
    // 获取加密密钥
    const key = getEncryptionKey();
    
    // 首先尝试使用encryption.ts中的decryptIdCardSimple函数
    try {
      // 导入解密函数
      const { decryptIdCardSimple } = require('@/lib/encryption');
      if (typeof decryptIdCardSimple === 'function') {
        // 优先使用decryptIdCardSimple函数进行解密
        const result = decryptIdCardSimple(text);
        if (result && !result.includes('[解密失败') && !result.includes('[解密出错]') && result !== text) {
          console.log('成功使用decryptIdCardSimple函数解密');
          return result;
        } else {
          console.log('decryptIdCardSimple函数解密失败或返回原文，尝试本地解密方法');
        }
      }
    } catch (importError) {
      console.error('导入decryptIdCardSimple函数失败，使用本地解密方法', importError);
    }
    
    // 特殊处理tkl1格式 - 尝试提取实际内容而不是直接返回替代值
    if (text.startsWith('tkl1')) {
      try {
        console.log('检测到tkl1格式，尝试解析实际内容');
        // 提取tkl1后面的部分，可能包含实际数据
        const payload = text.substring(4);
        
        // 尝试Base64解码
        if (payload && payload.length > 0) {
          try {
            // 将可能的Base64内容标准化
            let standardBase64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            // 添加必要的填充
            while (standardBase64.length % 4 !== 0) {
              standardBase64 += '=';
            }
            
            // 尝试解码
            const buffer = Buffer.from(standardBase64, 'base64');
            const decoded = buffer.toString('utf8');
            
            // 验证解码结果是否看起来像身份证号
            if (decoded && /^\d{17}[\dXx]$/i.test(decoded)) {
              console.log('成功从tkl1格式解析出身份证号');
              return decoded;
            }
            
            // 尝试作为加密数据进一步解密
            if (decoded && decoded.includes(':')) {
              try {
                const decodedParts = decoded.split(':');
                if (decodedParts.length === 2) {
                  const iv = Buffer.from(decodedParts[0], 'hex');
                  const encryptedData = Buffer.from(decodedParts[1], 'hex');
                  
                  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                  let decrypted = decipher.update(encryptedData);
                  decrypted = Buffer.concat([decrypted, decipher.final()]);
                  
                  const result = decrypted.toString();
                  if (result && /^\d{17}[\dXx]$/i.test(result)) {
                    console.log('成功从tkl1嵌套格式解析出身份证号');
                    return result;
                  }
                }
              } catch (nestedError) {
                console.log('tkl1嵌套格式解析失败');
              }
            }
          } catch (base64Error) {
            console.log('tkl1格式Base64解析失败');
          }
        }
        
        // 如果无法解析，则记录但仍然返回原始文本以便超级管理员查看
        console.log('无法解析tkl1格式，返回原始数据供管理员检查');
        return `[tkl1格式] ${text}`;
      } catch (tkl1Error) {
        console.error('处理tkl1格式时发生错误:', tkl1Error);
        return `[tkl1格式解析错误] ${text}`;
      }
    }
    
    // 特殊处理其他特殊格式 - 也尝试实际解密而不是替代
    if (text.includes('/9xy') || (text.length >= 60 && /^[A-Za-z0-9+/=_-]+$/.test(text))) {
      try {
        console.log('检测到特殊加密格式，尝试解析');
        
        // 将URL安全的Base64转回标准Base64
        let standardBase64 = text;
        // 替换URL安全字符为标准Base64字符
        standardBase64 = standardBase64.replace(/-/g, '+').replace(/_/g, '/');
        // 添加可能缺少的填充
        while (standardBase64.length % 4 !== 0) {
          standardBase64 += '=';
        }
        
        // 将Base64转回二进制数据
        const buffer = Buffer.from(standardBase64, 'base64');
        
        // 尝试多种解密方案
        // 首先尝试直接解码为文本
        try {
          const directDecoded = buffer.toString('utf8');
          if (directDecoded && /^\d{17}[\dXx]$/i.test(directDecoded)) {
            console.log('特殊格式直接解码成功');
            return directDecoded;
          }
        } catch (directDecodeError) {
          console.log('特殊格式直接解码失败');
        }
        
        // 尝试6字节IV方案（较新格式）
        if (buffer.length > 6) {
          try {
            const shortIv = buffer.slice(0, 6);
            const paddedIv = Buffer.concat([shortIv, Buffer.alloc(10)]); // 填充到16字节
            const encryptedData = buffer.slice(6);
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, paddedIv);
            let decrypted = decipher.update(encryptedData);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            const result = decrypted.toString();
            
            // 如果结果看起来合理，返回
            if (result && result.length >= 5 && /^[\x20-\x7E]+$/.test(result)) {
              console.log(`特殊格式解密成功(6字节IV): ${result.substring(0, 3)}***`);
              return result;
            }
          } catch (shortIvError) {
            console.log('特殊格式6字节IV方案解密失败');
          }
        }
        
        // 如果所有方法都失败，返回原始文本供管理员查看
        console.log('无法解析特殊格式，返回原始数据供管理员检查');
        return `[特殊格式] ${text}`;
      } catch (specialError) {
        console.error('处理特殊格式时发生错误:', specialError);
        return `[特殊格式解析错误] ${text}`;
      }
    }
    
    // 尝试使用标准AES-CBC解密
    if (text.includes(':')) {
      try {
        // 标准格式: IV:EncryptedHex
        const parts = text.split(':');
        if (parts.length !== 2) {
          return '格式错误: 不符合IV:EncryptedHex标准格式';
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = Buffer.from(parts[1], 'hex');
        
        if (iv.length !== IV_LENGTH) {
          return `格式错误: IV长度不正确 (预期${IV_LENGTH}字节，实际${iv.length}字节)`;
        }
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        const result = decrypted.toString();
        
        if (!result) {
          return '解密结果为空';
        }
        
        console.log(`标准格式解密成功: ${result.substring(0, 3)}***`);
        return result;
      } catch (standardError: any) {
        console.error('标准格式解密失败:', standardError);
        return `标准格式解密失败: ${standardError.message}`;
      }
    }
    
    // 尝试Base64解密
    try {
      if (/^[A-Za-z0-9+/=]+$/.test(text)) {
        const buffer = Buffer.from(text, 'base64');
        
        if (buffer.length <= IV_LENGTH) {
          return 'Base64格式错误: 数据长度不足';
        }
        
        const iv = buffer.slice(0, IV_LENGTH);
        const encryptedData = buffer.slice(IV_LENGTH);
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        const result = decrypted.toString();
        
        if (!result) {
          return 'Base64解密结果为空';
        }
        
        console.log(`Base64格式解密成功: ${result.substring(0, 3)}***`);
        return result;
      }
    } catch (base64Error: any) {
      console.error('Base64格式解密失败:', base64Error);
      return `Base64格式解密失败: ${base64Error.message}`;
    }
    
    // 检查是否是明文身份证号
    if (/^\d{17}[\dXx]$/i.test(text)) {
      console.log('输入内容符合身份证号格式，可能是明文');
      return text;
    }
    
    // 所有解密方法都失败，返回原始加密文本以便管理员检查
    return `[无法解密，未知格式] ${text}`;
  } catch (error: any) {
    console.error('解密函数发生错误:', error);
    return `解密出错: ${error.message}`;
  }
} 