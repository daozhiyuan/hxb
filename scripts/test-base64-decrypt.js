/**
 * Base64格式身份证号码解密测试脚本
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
console.log('加密密钥类型:', typeof ENCRYPTION_KEY);
console.log('加密密钥长度:', ENCRYPTION_KEY ? ENCRYPTION_KEY.length : 0);
const IV_LENGTH = 16;

// 处理加密密钥，确保可以处理Base64格式
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
  
  // 检查是否是标准的冒号分隔的Hex格式
  const parts = text.split(':');
  if (parts.length === 2) {
    // 检查IV部分是否为有效的hex字符串
    const ivRegex = /^[0-9a-f]{32}$/i;  // IV长度为16字节，转hex后为32个字符
    if (!ivRegex.test(parts[0])) return false;
    
    // 检查加密文本部分是否为有效的hex字符串
    const encTextRegex = /^[0-9a-f]+$/i;
    if (!encTextRegex.test(parts[1])) return false;
    
    console.log('检测到有效的十六进制格式加密数据');
    return true;
  }
  
  // 检查是否是Base64编码格式
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (base64Regex.test(text) && text.length > 20) {
    console.log('检测到可能是Base64格式的加密数据');
    return true;
  }
  
  return false;
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
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        const result = decrypted.toString();
        console.log(`Base64格式数据解密成功: ${result.substring(0, 4)}******${result.substring(14)}`);
        return result;
      } catch (error) {
        console.error('解密Base64格式数据失败:', error);
        return '解密失败 - Base64格式';
      }
    }
    
    // 尝试标准的hex格式解密
    try {
      // 分割IV和加密数据
      const parts = text.split(':');
      
      // 确保有两部分
      if (parts.length !== 2) {
        return '格式错误，请重新设置';
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      
      // 检查IV长度
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
      console.error('解密十六进制格式数据失败:', error);
      return '解密失败 - 十六进制格式';
    }
  } catch (error) {
    console.error('解密身份证号码失败:', error);
    return '解密失败 - 请重新设置';
  }
}

// 调试当前密钥
console.log('\n当前密钥信息:');
console.log(`密钥长度: ${key.length} 字节`);
if (key.length > 0) {
  console.log(`密钥前4字节(HEX): ${key.slice(0, 4).toString('hex')}`);
}

/**
 * 测试指定客户的身份证解密
 */
async function testDecrypt(customerId) {
  try {
    console.log(`\n测试客户ID ${customerId} 的身份证解密...`);
    
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
    console.log(`加密格式有效: ${isValidEncryptedFormat(customer.idCardNumberEncrypted)}`);
    
    // 尝试解密
    try {
      const decrypted = decryptIdCard(customer.idCardNumberEncrypted);
      console.log(`解密结果: ${decrypted}`);
      
      // 验证是否为有效身份证
      const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/i;
      const isValidFormat = idCardPattern.test(decrypted);
      console.log(`身份证格式是否有效: ${isValidFormat}`);
      
      // 格式化显示结果
      if (isValidFormat) {
        console.log('✅ 解密成功');
      } else {
        console.log('❌ 解密失败或格式无效');
      }
      
      return decrypted;
    } catch (error) {
      console.error('解密过程出错:', error);
      return null;
    }
  } catch (error) {
    console.error(`测试过程中发生错误:`, error);
  }
}

// 测试加密解密
async function testEncryptDecrypt() {
  const originalText = '110101198001010018'; // 示例身份证号码
  console.log(`\n测试加密解密功能:`);
  console.log(`原始文本: ${originalText}`);
  
  try {
    // 加密
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(originalText);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const encryptedHex = iv.toString('hex') + ':' + encrypted.toString('hex');
    console.log(`加密结果(HEX): ${encryptedHex}`);
    
    // 生成Base64格式的加密文本
    const combined = Buffer.concat([iv, encrypted]);
    const encryptedBase64 = combined.toString('base64');
    console.log(`加密结果(Base64): ${encryptedBase64}`);
    
    // 解密Hex格式
    console.log(`\n解密HEX格式:`);
    const decryptedHex = decryptIdCard(encryptedHex);
    console.log(`解密结果: ${decryptedHex}`);
    console.log(`解密结果是否正确: ${decryptedHex === originalText}`);
    
    // 解密Base64格式
    console.log(`\n解密Base64格式:`);
    const decryptedBase64 = decryptIdCard(encryptedBase64);
    console.log(`解密结果: ${decryptedBase64}`);
    console.log(`解密结果是否正确: ${decryptedBase64 === originalText}`);
    
  } catch (error) {
    console.error('测试加密解密功能失败:', error);
  }
}

// 主函数
async function runTests() {
  // 先测试加密解密功能
  await testEncryptDecrypt();
  
  // 测试数据库中的数据
  console.log('\n---------------------\n');
  await testDecrypt(21); // 测试特殊处理的客户ID
  
  console.log('\n---------------------\n');
  await testDecrypt(22); // 测试Base64格式
  
  console.log('\n---------------------\n');
  await testDecrypt(1); // 测试正常格式
  
  // 断开数据库连接
  await prisma.$disconnect();
}

// 执行测试
runTests(); 