#!/usr/bin/env node

// 验证加密密钥长度脚本
const crypto = require('crypto');

console.log('密钥长度验证测试');
console.log('------------------');

// 从环境变量获取加密密钥
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const OLD_ENCRYPTION_KEY = process.env.OLD_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('错误: ENCRYPTION_KEY 环境变量未设置');
  process.exit(1);
}

console.log('当前密钥信息:');
// 检查是否是Base64格式
try {
  // 将环境变量引号去掉处理
  const cleanKey = ENCRYPTION_KEY.replace(/^["'](.*)["']$/, '$1');
  
  // 检查是否是Base64格式
  if (/^[A-Za-z0-9+/=]+$/.test(cleanKey) && cleanKey.length % 4 === 0) {
    // 尝试将Base64字符串转换为Buffer
    const keyBuffer = Buffer.from(cleanKey, 'base64');
    console.log('- 检测到Base64格式密钥，已解码为字节数组');
    console.log(`- 密钥解码后长度: ${keyBuffer.length} 字节`);
    
    if (keyBuffer.length === 32) {
      console.log('- 状态: ✅ 密钥长度符合要求(32字节)');
    } else {
      console.log(`- 状态: ❌ 密钥长度不符合要求(期望32字节，实际${keyBuffer.length}字节)`);
    }
  } else {
    console.log('- 密钥不是Base64格式');
    console.log(`- 原始密钥值: [${ENCRYPTION_KEY}]`);
    console.log(`- 处理后密钥值: [${cleanKey}]`);
    console.log(`- 密钥长度: ${cleanKey.length} 字符`);
  }
} catch (error) {
  console.error('密钥检查过程中出错:', error.message);
}

// 如果设置了旧密钥，也进行检查
if (OLD_ENCRYPTION_KEY) {
  console.log('\n旧密钥信息:');
  try {
    // 将环境变量引号去掉处理
    const cleanOldKey = OLD_ENCRYPTION_KEY.replace(/^["'](.*)["']$/, '$1');
    
    // 检查是否是Base64格式
    if (/^[A-Za-z0-9+/=]+$/.test(cleanOldKey) && cleanOldKey.length % 4 === 0) {
      // 尝试将Base64字符串转换为Buffer
      const oldKeyBuffer = Buffer.from(cleanOldKey, 'base64');
      console.log('- 检测到Base64格式旧密钥，已解码为字节数组');
      console.log(`- 旧密钥解码后长度: ${oldKeyBuffer.length} 字节`);
    } else {
      console.log('- 旧密钥不是Base64格式');
      console.log(`- 原始旧密钥值: [${OLD_ENCRYPTION_KEY}]`);
      console.log(`- 处理后旧密钥值: [${cleanOldKey}]`);
      console.log(`- 旧密钥长度: ${cleanOldKey.length} 字符`);
    }
  } catch (error) {
    console.error('旧密钥检查过程中出错:', error.message);
  }
}

// 测试加密解密功能
console.log('\n加密解密功能测试:');

// 处理加密密钥，确保长度为32字节
function getValidKey(key) {
  if (!key) {
    throw new Error('密钥不能为空');
  }
  
  // 处理可能的引号问题
  const cleanKey = key.replace(/^["'](.*)["']$/, '$1');
  let keyBuffer;
  
  // 检查是否是Base64格式
  if (/^[A-Za-z0-9+/=]+$/.test(cleanKey) && cleanKey.length % 4 === 0) {
    // 尝试将Base64字符串转换为Buffer
    keyBuffer = Buffer.from(cleanKey, 'base64');
    console.log('- 检测到Base64格式密钥，已解码为字节数组');
  } else {
    // 如果不是Base64格式，按照常规方式处理
    let validKey = cleanKey;
    if (cleanKey.length < 32) {
      // 如果密钥太短，通过重复密钥来填充
      validKey = cleanKey.padEnd(32, cleanKey);
    } else if (cleanKey.length > 32) {
      // 如果密钥太长，截取前32个字符
      validKey = cleanKey.substring(0, 32);
    }
    
    keyBuffer = Buffer.from(validKey);
  }
  
  // 确保密钥长度为32字节
  if (keyBuffer.length !== 32) {
    console.warn(`- 警告: 密钥长度(${keyBuffer.length})不是32字节，将进行调整`);
    
    // 调整密钥长度为32字节
    if (keyBuffer.length < 32) {
      // 如果太短，填充到32字节，使用PKCS7填充算法
      const newBuffer = Buffer.alloc(32);
      keyBuffer.copy(newBuffer);
      const paddingByte = 32 - keyBuffer.length;
      for (let i = keyBuffer.length; i < 32; i++) {
        newBuffer[i] = paddingByte;
      }
      keyBuffer = newBuffer;
    } else {
      // 如果太长，截取前32字节
      keyBuffer = keyBuffer.slice(0, 32);
    }
  }
  
  return keyBuffer;
}

// 测试加密和解密
function testEncryptDecrypt() {
  try {
    // 获取有效密钥
    const currentKey = getValidKey(ENCRYPTION_KEY);
    console.log(`- 处理后的密钥长度: ${currentKey.length} 字节`);
    
    // 测试数据
    const testData = '110101199001011234';
    const iv = crypto.randomBytes(16);
    
    // 加密
    const cipher = crypto.createCipheriv('aes-256-cbc', currentKey, iv);
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 格式化为IV:加密数据的形式
    const encryptedResult = iv.toString('hex') + ':' + encrypted;
    console.log(`- 加密后数据: ${encryptedResult}`);
    
    // 解密
    const parts = encryptedResult.split(':');
    const decryptIv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', currentKey, decryptIv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log(`- 解密后数据: ${decrypted}`);
    console.log(`- 加密解密测试: ${decrypted === testData ? '✅ 成功' : '❌ 失败'}`);
    
    // 尝试用旧密钥解密
    if (OLD_ENCRYPTION_KEY) {
      try {
        const oldKey = getValidKey(OLD_ENCRYPTION_KEY);
        console.log(`\n旧密钥测试:`);
        console.log(`- 处理后的旧密钥长度: ${oldKey.length} 字节`);
        
        // 使用旧密钥加密
        const oldCipher = crypto.createCipheriv('aes-256-cbc', oldKey, iv);
        let oldEncrypted = oldCipher.update(testData, 'utf8', 'hex');
        oldEncrypted += oldCipher.final('hex');
        
        // 解密
        const oldResult = iv.toString('hex') + ':' + oldEncrypted;
        const oldParts = oldResult.split(':');
        const oldDecryptIv = Buffer.from(oldParts[0], 'hex');
        const oldEncryptedText = Buffer.from(oldParts[1], 'hex');
        
        const oldDecipher = crypto.createDecipheriv('aes-256-cbc', oldKey, oldDecryptIv);
        let oldDecrypted = oldDecipher.update(oldEncryptedText, undefined, 'utf8');
        oldDecrypted += oldDecipher.final('utf8');
        
        console.log(`- 旧密钥加密后的数据: ${oldResult}`);
        console.log(`- 解密结果: ${oldDecrypted}`);
        console.log(`- 旧密钥测试: ${oldDecrypted === testData ? '✅ 成功' : '❌ 失败'}`);
      } catch (error) {
        console.error(`- 旧密钥测试失败: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('- 加密解密测试失败:', error.message);
    return false;
  }
}

// 执行测试
testEncryptDecrypt(); 