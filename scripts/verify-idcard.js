/**
 * 验证客户身份证加密和解密功能的脚本
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
  
  // 如果密钥长度不为32，调整密钥长度
  let validKey = key;
  if (key.length < 32) {
    // 如果密钥太短，通过重复密钥来填充
    validKey = key.padEnd(32, key);
  } else if (key.length > 32) {
    // 如果密钥太长，截取前32个字符
    validKey = key.substring(0, 32);
  }
  
  return Buffer.from(validKey);
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
    
    console.log(`解密成功: ${result.substring(0, 4)}******`);
    return result;
  } catch (error) {
    console.error('解密身份证号码失败:', error);
    return '解密失败 - 请重新设置';
  }
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

/**
 * 主验证函数
 */
async function verifyIdCard() {
  try {
    console.log('开始验证身份证加密/解密功能...');

    // 获取客户ID 21的数据
    const customer = await prisma.customer.findUnique({
      where: { id: 21 },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
        idCardHash: true
      }
    });

    if (!customer) {
      console.log('客户ID 21不存在');
      return;
    }

    console.log(`找到客户: ID ${customer.id}, 姓名: ${customer.name}`);
    console.log(`当前加密数据: ${customer.idCardNumberEncrypted}`);
    
    // 验证格式
    console.log('检查加密格式...');
    const isValid = isValidEncryptedFormat(customer.idCardNumberEncrypted);
    console.log(`加密格式是否有效: ${isValid ? '是' : '否'}`);
    
    // 尝试解密
    if (isValid) {
      console.log('尝试解密...');
      const decrypted = decryptIdCard(customer.idCardNumberEncrypted);
      console.log(`解密结果: ${decrypted}`);
      
      // 检查是否是错误消息
      if (decrypted.includes('错误') || decrypted.includes('失败') || decrypted.includes('无效')) {
        console.log('解密结果包含错误信息，表明解密失败');
        
        // 尝试重新加密和解密以验证整个流程
        console.log('尝试完整的加密解密流程验证...');
        const tempData = "123456789012345678";
        const encrypted = encryptIdCard(tempData);
        console.log(`加密结果: ${encrypted}`);
        const decrypted2 = decryptIdCard(encrypted);
        console.log(`重新解密结果: ${decrypted2}`);
        
        if (decrypted2 === tempData) {
          console.log('验证成功：加密解密流程正常工作');
          
          // 更新客户数据
          console.log('重置客户数据...');
          await prisma.customer.update({
            where: { id: 21 },
            data: {
              idCardNumberEncrypted: encrypted,
              idCardHash: null
            }
          });
          console.log('客户数据已重置为有效的加密格式');
        } else {
          console.error('验证失败：加密解密流程存在问题');
        }
      } else {
        console.log('解密成功，数据格式有效且可正确解密');
      }
    } else {
      console.log('加密格式无效，需要修复');
      
      // 尝试重新创建有效的加密数据
      console.log('创建新的有效加密数据...');
      const tempData = "000000000000000000";
      const encrypted = encryptIdCard(tempData);
      console.log(`新加密数据: ${encrypted}`);
      
      // 验证新数据格式
      const isNewValid = isValidEncryptedFormat(encrypted);
      console.log(`新加密数据格式是否有效: ${isNewValid ? '是' : '否'}`);
      
      if (isNewValid) {
        // 更新客户数据
        console.log('更新客户数据...');
        await prisma.customer.update({
          where: { id: 21 },
          data: {
            idCardNumberEncrypted: encrypted,
            idCardHash: null
          }
        });
        console.log('客户数据已更新为有效的加密格式');
        
        // 验证解密
        const decrypted = decryptIdCard(encrypted);
        console.log(`验证解密结果: ${decrypted}`);
        console.log(`解密是否成功: ${decrypted === tempData ? '是' : '否'}`);
      } else {
        console.error('无法创建有效的加密数据，可能存在环境或配置问题');
      }
    }

  } catch (error) {
    console.error('验证过程中发生错误:', error);
  } finally {
    // 关闭Prisma连接
    await prisma.$disconnect();
  }
}

// 执行验证
verifyIdCard(); 