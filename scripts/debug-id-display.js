/**
 * 调试IdNumberDisplay组件问题的脚本
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// 加密相关常量
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
    
    console.log(`解密输入: ${text}`);
    
    // 检查格式是否有效
    if (!isValidEncryptedFormat(text)) {
      console.warn('数据格式不符合加密标准，可能是未加密数据或格式错误');
      return text; // 直接返回原文，可能已经是解密后的数据
    }
    
    // 正常解密流程
    const textParts = text.split(':');
    console.log(`分割后的部分数量: ${textParts.length}`);
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    console.log(`IV长度: ${iv.length}字节`);
    console.log(`加密数据长度: ${encryptedText.length}字节`);
    
    if (iv.length !== IV_LENGTH) {
      console.warn(`IV长度不正确: ${iv.length}，预期: ${IV_LENGTH}`);
      return text; // 直接返回原文
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const result = decrypted.toString();
    
    console.log(`解密结果: ${result}`);
    console.log(`解密结果长度: ${result.length}`);
    
    return result;
  } catch (error) {
    console.error('解密过程出错:', error);
    return text; // 出错时返回原文
  }
}

// 模拟API解密处理
function simulateApiDecryption(encryptedIdNumber) {
  console.log('\n模拟API解密处理...');
  try {
    // 模拟角色
    const isSuper = true;
    console.log(`是否超级管理员: ${isSuper}`);
    
    // 模拟解密过程
    let decryptedIdNumber = '';
    try {
      decryptedIdNumber = encryptedIdNumber ? decryptIdCard(encryptedIdNumber) : '';
      
      // 如果解密失败，处理特定的错误消息
      if (decryptedIdNumber === '解密失败' || decryptedIdNumber === '格式错误' || decryptedIdNumber === '密钥未配置') {
        console.warn(`证件号码解密失败: ${decryptedIdNumber}`);
        decryptedIdNumber = '[解密失败]';
      }
    } catch (error) {
      console.error('证件号码解密过程出错:', error);
      decryptedIdNumber = '[解密出错]';
    }
    
    console.log(`API返回的解密结果: ${decryptedIdNumber}`);
    
    // 模拟组件显示
    simulateComponentDisplay(decryptedIdNumber, 'CHINA_MAINLAND', isSuper);
    
  } catch (error) {
    console.error('模拟过程出错:', error);
  }
}

// 模拟IdNumberDisplay组件
function simulateComponentDisplay(idNumber, idCardType, isSuper) {
  console.log('\n模拟IdNumberDisplay组件显示...');
  console.log(`输入idNumber: ${idNumber}`);
  console.log(`证件类型: ${idCardType}`);
  console.log(`是否超级管理员: ${isSuper}`);
  
  if (!idNumber) {
    console.log('显示结果: 保密');
    return;
  }
  
  if (isSuper) {
    console.log(`超级管理员视图，完整显示: ${idNumber}`);
    return;
  }
  
  // 根据证件类型使用不同的掩码规则
  let maskedIdNumber = idNumber;
  
  if (idCardType === 'CHINA_MAINLAND' && idNumber.length >= 18) {
    maskedIdNumber = `${idNumber.substring(0, 4)}************${idNumber.substring(idNumber.length - 2)}`;
  } else if (idCardType === 'PASSPORT' && idNumber.length >= 5) {
    const letterPart = idNumber.match(/^[A-Z]+/i) || [''];
    maskedIdNumber = `${letterPart[0]}*****${idNumber.substring(idNumber.length - 1)}`;
  } else if (idCardType === 'HONG_KONG_ID' && idNumber.length >= 8) {
    const letterPart = idNumber.match(/^[A-Z]+/i) || [''];
    const checkDigit = idNumber.match(/\([0-9A]\)$/) || [''];
    maskedIdNumber = `${letterPart[0]}******${checkDigit[0] || idNumber.substring(idNumber.length - 1)}`;
  } else if (idNumber.length > 4) {
    maskedIdNumber = `${idNumber.substring(0, 2)}****${idNumber.substring(idNumber.length - 2)}`;
  }
  
  console.log(`非管理员视图，掩码显示: ${maskedIdNumber}`);
}

// 测试特定加密字符串
function testEncryptedString() {
  const encryptedString = '11b9ffe211a1934bfd73110c1126e572:da20e1d0a53fb87ead2859b8f381f9b53b8d94945094acc1d259f79ffe871d94048a0bb22f2e7f19d5fa25e178d7e1c99607f4a71dc30f8f01b2daa7a7928bac7b3f9c0a3e513ecb1224821c26998e0d';
  
  console.log('\n=== 开始测试特定加密字符串 ===');
  console.log(`加密字符串: ${encryptedString}`);
  
  // 检查加密格式
  console.log(`加密格式有效: ${isValidEncryptedFormat(encryptedString)}`);
  
  // 模拟API解密处理
  simulateApiDecryption(encryptedString);
}

// 执行测试
testEncryptedString(); 