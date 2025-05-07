import crypto from 'crypto';

// 从环境变量获取加密密钥（仅服务器端可用）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const OLD_ENCRYPTION_KEY = process.env.OLD_ENCRYPTION_KEY;
const IV_LENGTH = 16;

// 处理加密密钥，确保长度为32字节，支持Base64格式
function getValidKey(key: string | undefined): Buffer {
  if (!key) {
    throw new Error('ENCRYPTION_KEY 环境变量必须设置');
  }
  
  let keyBuffer: Buffer;
  
  // 检查是否是Base64格式
  try {
    // 尝试从Base64解码
    if (key.match(/^[A-Za-z0-9+/=]+$/) && key.length % 4 === 0) {
      // 尝试将Base64字符串转换为Buffer
      keyBuffer = Buffer.from(key, 'base64');
      console.log('检测到Base64格式密钥，已解码为字节数组');
    } else {
      // 如果不是Base64格式，按照常规方式处理
      let validKey = key;
      if (key.length < 32) {
        // 如果密钥太短，通过重复密钥来填充
        validKey = key.padEnd(32, key);
      } else if (key.length > 32) {
        // 如果密钥太长，截取前32个字符
        validKey = key.substring(0, 32);
      }
      
      keyBuffer = Buffer.from(validKey);
    }
    
    // 确保密钥长度为32字节
    if (keyBuffer.length !== 32) {
      console.warn(`警告: 密钥长度(${keyBuffer.length})不是32字节，将进行调整`);
      // 调整密钥长度为32字节
      if (keyBuffer.length < 32) {
        // 如果太短，填充到32字节
        const newBuffer = Buffer.alloc(32);
        keyBuffer.copy(newBuffer);
        for (let i = keyBuffer.length; i < 32; i++) {
          newBuffer[i] = keyBuffer[i % keyBuffer.length];
        }
        keyBuffer = newBuffer;
      } else {
        // 如果太长，截取前32字节
        keyBuffer = keyBuffer.slice(0, 32);
      }
    }
    
    return keyBuffer;
  } catch (error) {
    console.error('处理密钥时出错:', error);
    throw error;
  }
}

// 获取有效的密钥（仅服务器端）
let currentKey: Buffer;
let oldKey: Buffer | null = null;
// 确保这段代码只在服务器端运行
if (typeof window === 'undefined') {
  currentKey = getValidKey(ENCRYPTION_KEY);
  
  // 如果设置了旧密钥，也对其进行处理
  if (OLD_ENCRYPTION_KEY) {
    oldKey = getValidKey(OLD_ENCRYPTION_KEY);
    console.log('检测到旧密钥，将尝试用于解密历史数据');
  }
}

// 加密身份证号码（仅服务器端）
export function encryptIdCard(text: string): string {
  // 确保这个函数只在服务器端运行
  if (typeof window !== 'undefined') {
    console.error('警告: encryptIdCard 只能在服务器端使用');
    return '';
  }
  
  try {
    // 检查输入是否为有效身份证号码
    if (!validateIdCard(text)) {
      console.warn('警告: 提供的数据不是有效的身份证号码格式');
      throw new Error('无效的身份证号码格式');
    }
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', currentKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // 使用十六进制格式存储，格式为: iv:encryptedData
    const result = iv.toString('hex') + ':' + encrypted.toString('hex');
    console.log(`身份证号码加密成功，长度: ${result.length}`);
    
    return result;
  } catch (error) {
    console.error('加密身份证号码失败:', error);
    throw new Error('加密失败，请稍后重试');
  }
}

// 尝试使用特定密钥解密数据
function tryDecryptWithKey(text: string, key: Buffer): { success: boolean; result: string } {
  try {
    const textParts = text.split(':');
    
    // 格式检查
    if (textParts.length !== 2) {
      return { success: false, result: '格式错误' };
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    // 检查IV长度是否为16字节
    if (iv.length !== IV_LENGTH) {
      return { success: false, result: 'IV长度错误' };
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const result = decrypted.toString();
    
    // 验证解密结果是否有效
    if (!result || result.length < 5) {
      return { success: false, result: '解密结果无效' };
    }
    
    return { success: true, result };
  } catch (error: any) {
    return { success: false, result: `解密失败: ${error?.message || '未知错误'}` };
  }
}

// 解密身份证号码（仅服务器端）
export function decryptIdCard(text: string): string {
  // 确保这个函数只在服务器端运行
  if (typeof window !== 'undefined') {
    console.error('警告: decryptIdCard 只能在服务器端使用');
    return '';
  }
  
  try {
    if (!text) return '';
    
    // 检查是否是有效的身份证号码格式
    const idCardPattern = /^\d{17}[\dX]$/i;
    if (idCardPattern.test(text)) {
      console.info('数据是未加密的身份证号码格式，直接返回');
      return text;
    }
    
    // 检查格式是否有效
    if (!isValidEncryptedFormat(text)) {
      console.warn('数据格式不符合加密标准，可能是未加密数据或格式错误');
      
      // 如果看起来像有效的身份证号码，直接返回
      if (text.match(/^\d{17}[\dX]$/i)) {
        console.warn('数据看起来像未加密的身份证号码，直接返回');
        return text;
      }
      
      // 如果是我们在auto-fix-encryption.js中生成的临时数据，尝试读取
      if (text.match(/^110101/) && text.length >= 15) {
        console.warn('检测到可能是auto-fix-encryption脚本生成的临时身份证号码');
        return text;
      }
      
      return '格式错误，请重新设置';
    }
    
    // 检查是否可能是Base64格式
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!text.includes(':') && base64Regex.test(text)) {
      try {
        // 尝试解密Base64格式
        console.log('尝试解密Base64格式的数据');
        
        // 将Base64转回二进制数据
        const buffer = Buffer.from(text, 'base64');
        
        // 从二进制数据中提取IV和加密文本
        // 假设前16字节是IV，后面的是加密数据
        if (buffer.length <= 16) {
          console.error('Base64数据格式无效: 长度不足');
          return '解密失败 - 格式错误';
        }
        
        const iv = buffer.slice(0, 16);
        const encryptedData = buffer.slice(16);
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', currentKey, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        const result = decrypted.toString();
        console.log(`Base64格式数据解密成功: ${result}`);
        return result;
      } catch (error) {
        console.error('解密Base64格式数据失败:', error);
        return '解密失败 - Base64格式';
      }
    }
    
    // 首先尝试使用当前密钥解密
    let decryptResult = tryDecryptWithKey(text, currentKey);
    
    // 如果使用当前密钥解密失败并且存在旧密钥，尝试使用旧密钥
    if (!decryptResult.success && oldKey) {
      console.log('使用当前密钥解密失败，尝试使用旧密钥...');
      decryptResult = tryDecryptWithKey(text, oldKey);
      
      if (decryptResult.success) {
        console.log('使用旧密钥解密成功');
        
        // 记录该数据需要使用新密钥重新加密
        logReencryptionNeeded(text, decryptResult.result);
      }
    }
    
    if (decryptResult.success) {
      return decryptResult.result;
    } else {
      console.error('解密失败:', decryptResult.result);
      return '解密失败 - 请重新设置';
    }
  } catch (error) {
    console.error('解密身份证号码失败:', error);
    return '解密失败 - 请重新设置';
  }
}

// 记录需要重新加密的数据
function logReencryptionNeeded(encryptedText: string, plainText: string) {
  // 在实际应用中，这里可以记录到数据库或日志系统中
  try {
    // 创建一个简化的哈希作为标识符（不包含敏感信息）
    const identifier = crypto
      .createHash('sha256')
      .update(encryptedText)
      .digest('hex')
      .substring(0, 8);
    
    console.log(`标记需要重新加密的数据: ${identifier}`);
    
    // 在开发环境中，可以将这些记录写入一个文件
    if (process.env.NODE_ENV === 'development') {
      const fs = require('fs');
      const path = require('path');
      
      const logDir = path.resolve(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, 'reencryption-needed.log');
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${identifier}\n`);
    }
  } catch (error: unknown) {
    console.error('记录重新加密信息失败:', error);
    // 只记录错误，不影响解密流程
  }
}

// 生成身份证号码的哈希值（仅服务器端）
export function hashIdCard(text: string): string {
  if (!text) {
    throw new Error('身份证号码不能为空');
  }
  
  // 去除空格并转换为大写
  text = text.trim().toUpperCase();
  
  // 验证身份证号码格式
  if (!validateIdCard(text)) {
    throw new Error('无效的身份证号码格式');
  }
  
  // 使用SHA-256生成哈希值
  return crypto.createHash('sha256').update(text).digest('hex');
}

// 验证身份证号码
export function validateIdCard(idCard: string): boolean {
  if (!idCard) {
    console.warn('身份证号码为空');
    return false;
  }

  // 去除空格
  idCard = idCard.trim();
  console.log('去除空格后:', idCard);

  // 基本格式检查
  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    console.warn('身份证号码格式不正确');
    return false;
  }

  // 提取地区码和出生日期
  const areaCode = idCard.substring(0, 6);
  const birthDate = idCard.substring(6, 14);
  console.log('地区码:', areaCode);
  console.log('出生日期:', `${birthDate.substring(0, 4)}年${birthDate.substring(4, 6)}月${birthDate.substring(6, 8)}日`);

  // 验证出生日期
  const year = parseInt(birthDate.substring(0, 4));
  const month = parseInt(birthDate.substring(4, 6));
  const day = parseInt(birthDate.substring(6, 8));
  const date = new Date(year, month - 1, day);
  
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    console.warn('出生日期无效');
    return false;
  }

  // 验证校验码
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checksumMap = '10X98765432';
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    const digit = parseInt(idCard[i]);
    const weight = weights[i];
    const product = digit * weight;
    sum += product;
    console.log(`第${i + 1}位: ${digit} × ${weight} = ${product}, 当前和: ${sum}`);
  }

  const checksum = checksumMap[sum % 11];
  const lastChar = idCard[17].toUpperCase();
  
  console.log(`校验和: ${sum}, 校验码: ${checksum}, 最后一位: ${lastChar}`);
  
  return checksum === lastChar;
}

// 检查是否是有效的加密格式
export function isValidEncryptedFormat(text: string): boolean {
  if (!text) return false;
  
  // 检查是否包含冒号分隔符
  if (!text.includes(':')) return false;
  
  const parts = text.split(':');
  
  // 应该有两部分：IV和加密数据
  if (parts.length !== 2) return false;
  
  const [ivHex, dataHex] = parts;
  
  // 检查IV是否是有效的十六进制字符串并且长度正确
  if (!/^[0-9a-f]+$/i.test(ivHex) || ivHex.length !== IV_LENGTH * 2) return false;
  
  // 检查加密数据是否是有效的十六进制字符串
  if (!/^[0-9a-f]+$/i.test(dataHex)) return false;
  
  return true;
}

// 使用新密钥重新加密数据
export function reencryptData(text: string): string | null {
  try {
    // 首先解密数据
    const decrypted = decryptIdCard(text);
    
    // 如果解密失败或结果不是一个有效的身份证号码，返回null
    if (!decrypted || decrypted.startsWith('解密失败') || !validateIdCard(decrypted)) {
      return null;
    }
    
    // 使用当前密钥重新加密
    return encryptIdCard(decrypted);
  } catch (error) {
    console.error('重新加密数据失败:', error);
    return null;
  }
}

// 查找所有需要重新加密的数据（管理员工具）
export async function findDataToReencrypt(): Promise<Array<{ id: string; encrypted: string }>> {
  // 确保这个函数只在服务器端运行
  if (typeof window !== 'undefined') {
    console.error('警告: findDataToReencrypt 只能在服务器端使用');
    return [];
  }
  
  // 这里是一个占位函数，实际应用中需要根据具体的数据库结构实现
  try {
    console.log('查找需要重新加密的数据...');
    
    // 在实际应用中，这里需要查询数据库
    // 例如，尝试解密数据库中的每个记录，如果只能用旧密钥解密成功，则标记为需要重新加密
    
    // 返回空数组作为占位符
    return [];
  } catch (error) {
    console.error('查找需要重新加密的数据失败:', error);
    return [];
  }
}

// 批量重新加密数据（管理员工具）
export async function batchReencrypt(ids: string[]): Promise<{ success: number; failed: number }> {
  // 确保这个函数只在服务器端运行
  if (typeof window !== 'undefined') {
    console.error('警告: batchReencrypt 只能在服务器端使用');
    return { success: 0, failed: 0 };
  }
  
  // 这里是一个占位函数，实际应用中需要根据具体的数据库结构实现
  try {
    console.log(`批量重新加密 ${ids.length} 条数据...`);
    
    // 在实际应用中，这里需要更新数据库记录
    
    // 返回假数据作为占位符
    return { 
      success: ids.length, 
      failed: 0 
    };
  } catch (error) {
    console.error('批量重新加密数据失败:', error);
    return { 
      success: 0, 
      failed: ids.length 
    };
  }
} 