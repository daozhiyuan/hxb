/**
 * 特定加密字符串解密测试脚本
 */

// 导入所需模块
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

// 解密Base64格式数据
function decryptBase64(base64String) {
  try {
    console.log('尝试解密Base64格式数据...');
    // 将Base64转回二进制数据
    const buffer = Buffer.from(base64String, 'base64');
    
    // 从二进制数据中提取IV和加密文本
    // 假设前16字节是IV，后面的是加密数据
    if (buffer.length <= 16) {
      console.error('Base64数据格式无效: 长度不足');
      return '解密失败 - Base64格式错误';
    }
    
    const iv = buffer.slice(0, 16);
    const encryptedData = buffer.slice(16);
    
    console.log(`IV长度: ${iv.length}字节`);
    console.log(`加密数据长度: ${encryptedData.length}字节`);
    
    // 尝试解密
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      const result = decrypted.toString();
      
      // 验证解密结果是否有效
      if (!result || result.length < 5) {
        console.error('Base64解密结果无效或太短');
        return '解密结果无效，请重新设置';
      }
      
      console.log(`Base64解密成功！`);
      return result;
    } catch (error) {
      console.error('解密Base64数据出错:', error);
      return '解密Base64数据失败';
    }
  } catch (error) {
    console.error('处理Base64格式时出错:', error);
    return '处理Base64格式失败';
  }
}

// 测试问题中的特定加密字符串
function testSpecificEncryption() {
  try {
    // 问题中的加密字符串
    const encryptedString = '11b9ffe211a1934bfd73110c1126e572:da20e1d0a53fb87ead2859b8f381f9b53b8d94945094acc1d259f79ffe871d94048a0bb22f2e7f19d5fa25e178d7e1c99607f4a71dc30f8f01b2daa7a7928bac7b3f9c0a3e513ecb1224821c26998e0d';
    
    console.log(`\n测试特定加密字符串解密...`);
    console.log(`加密字符串: ${encryptedString}`);
    
    // 检查加密格式
    console.log(`加密格式有效: ${isValidEncryptedFormat(encryptedString)}`);
    
    // 尝试解密
    console.log(`正在尝试第一层解密...`);
    const firstLevelDecrypted = decryptIdCard(encryptedString);
    console.log(`第一层解密结果: ${firstLevelDecrypted}`);
    
    // 检查是否是Base64格式，尝试二次解密
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (base64Regex.test(firstLevelDecrypted)) {
      console.log('检测到Base64格式，尝试第二层解密...');
      const secondLevelDecrypted = decryptBase64(firstLevelDecrypted);
      console.log(`最终解密结果: ${secondLevelDecrypted}`);
      
      if (secondLevelDecrypted && !secondLevelDecrypted.includes('解密失败') && !secondLevelDecrypted.includes('格式错误')) {
        console.log(`解密成功！原始证件号码: ${secondLevelDecrypted}`);
      } else {
        console.log(`第二层解密失败，结果为: ${secondLevelDecrypted}`);
      }
    } else if (firstLevelDecrypted && !firstLevelDecrypted.includes('解密失败') && !firstLevelDecrypted.includes('格式错误')) {
      console.log(`解密成功！原始证件号码: ${firstLevelDecrypted}`);
    } else {
      console.log(`解密失败，结果为: ${firstLevelDecrypted}`);
    }
  } catch (error) {
    console.error('测试过程出错:', error);
  }
}

// 执行测试
testSpecificEncryption(); 