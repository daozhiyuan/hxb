/**
 * 身份证号码加密解密测试脚本
 */

// 导入所需模块
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 手动读取.env文件
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    content.split('\n').forEach(line => {
      // 忽略注释和空行
      if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          // 移除引号
          envVars[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('读取.env文件失败:', error);
    return {};
  }
}

// 加载环境变量
const env = loadEnv();
console.log('已加载环境变量');

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 加密相关函数
const ENCRYPTION_KEY = env.ENCRYPTION_KEY;
console.log('加密密钥长度:', ENCRYPTION_KEY ? ENCRYPTION_KEY.length : 0);
const IV_LENGTH = 16;

// 处理加密密钥，确保长度为32字节
function getValidKey(key) {
  if (!key) {
    throw new Error('ENCRYPTION_KEY 环境变量必须设置');
  }
  
  let keyBuffer;
  
  // 检查是否是Base64格式
  try {
    // 尝试从Base64解码
    if (key.match(/^[A-Za-z0-9+/=]+$/) && key.length % 4 === 0) {
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
    
    console.log(`处理后的密钥长度: ${keyBuffer.length} 字节`);
    return keyBuffer;
  } catch (error) {
    console.error('处理密钥时出错:', error);
    throw error;
  }
}

// 获取有效的密钥
const key = getValidKey(ENCRYPTION_KEY);

// 检查加密数据格式是否有效
function isValidEncryptedFormat(text) {
  if (!text) return false;
  
  // 检查格式：iv:encryptedText
  const parts = text.split(':');
  if (parts.length !== 2) return false;
  
  // 检查IV部分是否为有效的hex字符串
  const ivRegex = /^[0-9a-f]{32}$/i;  // IV长度为16字节，转hex后为32个字符
  if (!ivRegex.test(parts[0])) return false;
  
  // 检查加密文本部分是否为有效的hex字符串
  const encTextRegex = /^[0-9a-f]+$/i;
  if (!encTextRegex.test(parts[1])) return false;
  
  // 检查加密文本长度 - 确保不是太短
  if (parts[1].length < 10) return false;
  
  return true;
}

// 加密身份证号码
function encryptIdCard(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('加密身份证号码失败:', error);
    throw new Error('加密失败，请稍后重试');
  }
}

// 解密身份证号码
function decryptIdCard(text) {
  try {
    if (!text) return '';
    
    // 检查格式是否有效
    if (!isValidEncryptedFormat(text)) {
      console.warn('数据格式不符合加密标准，可能是未加密数据或格式错误');
      return '格式错误，请重新设置';
    }
    
    // 正常解密流程
    const textParts = text.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    if (iv.length !== IV_LENGTH) {
      console.warn(`IV长度不正确: ${iv.length}，预期: ${IV_LENGTH}`);
      return '格式错误，请重新设置';
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const result = decrypted.toString();
    
    // 验证解密结果是否有效
    if (!result || result.length < 5) {
      console.error('解密结果无效或太短');
      return '解密结果无效，请重新设置';
    }
    
    return result;
  } catch (error) {
    console.error('解密身份证号码失败:', error);
    return '解密失败 - 请重新设置';
  }
}

/**
 * 测试指定客户的身份证解密
 */
async function testDecrypt(customerId) {
  try {
    console.log(`测试客户ID ${customerId} 的身份证解密...`);
    
    // 获取客户数据
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true
      }
    });
    
    if (!customer) {
      console.log(`客户ID ${customerId} 不存在`);
      return;
    }
    
    console.log(`客户ID: ${customer.id}`);
    console.log(`姓名: ${customer.name}`);
    console.log(`加密数据: ${customer.idCardNumberEncrypted}`);
    
    // 检查加密格式
    console.log(`\n加密格式有效: ${isValidEncryptedFormat(customer.idCardNumberEncrypted)}`);
    
    // 尝试解密
    try {
      const decrypted = decryptIdCard(customer.idCardNumberEncrypted);
      console.log(`解密结果(部分隐藏): ${decrypted.substring(0, 6)}********${decrypted.substring(14)}`);
      console.log(`解密结果(完整号码): ${decrypted}`);
      
      // 验证是否为有效身份证
      const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/i;
      
      // 支持多种证件类型的验证
      let isValidId = false;
      
      // 1. 中国大陆身份证
      if (idCardPattern.test(decrypted)) {
        isValidId = true;
      }
      // 2. 护照 - 1-2位字母 + 7-8位数字
      else if (/^[A-Z]{1,2}\d{7,8}$/.test(decrypted)) {
        isValidId = true;
      }
      // 3. 港澳通行证 - H或M + 8位数字
      else if (/^[HM]\d{8}$/.test(decrypted)) {
        isValidId = true;
      }
      // 4. 台湾通行证 - T + 8位数字
      else if (/^T\d{8}$/.test(decrypted)) {
        isValidId = true;
      }
      // 5. 外国人永久居留证 - 字母 + 数字组合
      else if (/^[A-Z]\d{7,9}$/.test(decrypted)) {
        isValidId = true;
      }
      
      console.log(`身份证格式是否有效: ${isValidId}`);
      
      return decrypted;
    } catch (error) {
      console.error('解密过程出错:', error);
      return null;
    }
  } catch (error) {
    console.error(`测试过程中发生错误:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// 测试多个客户ID
async function runTests() {
  // 测试不同的客户ID
  await testDecrypt(1);
  console.log('\n---------------------\n');
  
  await testDecrypt(13);
  console.log('\n---------------------\n');
  
  // 测试特殊处理的客户ID 21
  await testDecrypt(21);
}

// 执行测试
runTests(); 