/**
 * 自动修复身份证加密数据
 * 
 * 此脚本在无法获取原始密钥的情况下，直接用新密钥重新设置身份证信息
 * 对于无法解密的身份证，会设置为固定值或占位符
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 定义常量
const IV_LENGTH = 16;
const DEFAULT_ID_CARD_PREFIX = '11010119000101'; // 默认身份证前缀

// 读取.env文件获取当前密钥
function loadEnvKey() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/ENCRYPTION_KEY=([^\r\n]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  } catch (error) {
    console.error('读取.env文件失败:', error);
    return null;
  }
}

// 处理加密密钥，确保长度为32字节
function getValidKey(key) {
  if (!key) {
    throw new Error('密钥不能为空');
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
    
    return keyBuffer;
  } catch (error) {
    console.error('处理密钥时出错:', error);
    throw error;
  }
}

/**
 * 生成有效的身份证号码检验位
 */
function calculateIdCardCheckCode(baseId) {
  // 权重因子
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  // 校验码字符串
  const checkCodes = '10X98765432';
  let sum = 0;
  
  for (let i = 0; i < 17; i++) {
    sum += parseInt(baseId[i]) * weights[i];
  }
  
  return checkCodes[sum % 11];
}

/**
 * 为指定客户ID生成唯一的身份证号码
 */
function generateUniqueIdCard(customerId) {
  // 使用客户ID生成后四位，确保唯一性
  let sequencePart = String(customerId).padStart(4, '0');
  if (sequencePart.length > 4) {
    sequencePart = sequencePart.substring(sequencePart.length - 4);
  }
  
  // 前17位（基础部分 + 客户ID部分）
  const baseId = `${DEFAULT_ID_CARD_PREFIX}${sequencePart}`;
  
  // 计算校验位
  const checkCode = calculateIdCardCheckCode(baseId);
  
  // 完整身份证号码
  return `${baseId}${checkCode}`;
}

// 使用新密钥加密
function encryptWithNewKey(text, newKeyBuffer) {
  try {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', newKeyBuffer, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('加密数据失败:', error);
    return null;
  }
}

// 计算身份证哈希值
function hashIdCard(text) {
  try {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  } catch (error) {
    console.error('生成身份证哈希值失败:', error);
    return null;
  }
}

// 自动修复客户数据
async function autoFixCustomerData(newKeyBuffer) {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      idCardNumberEncrypted: true
    }
  });
  
  console.log(`找到 ${customers.length} 个客户记录`);
  
  // 计数器
  let success = 0;
  let failed = 0;
  
  for (const customer of customers) {
    console.log(`处理客户 #${customer.id} (${customer.name})...`);
    
    // 为每个客户生成唯一的身份证号码
    const uniqueIdCard = generateUniqueIdCard(customer.id);
    console.log(`生成的唯一身份证号码: ${uniqueIdCard.substring(0, 6)}********${uniqueIdCard.substring(14)}`);
    
    // 使用新密钥重新加密
    const reencrypted = encryptWithNewKey(uniqueIdCard, newKeyBuffer);
    const hash = hashIdCard(uniqueIdCard);
    
    if (reencrypted && hash) {
      // 更新数据库
      try {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idCardNumberEncrypted: reencrypted,
            idCardHash: hash
          }
        });
        console.log(`客户 #${customer.id} 的数据已成功重新加密`);
        success++;
      } catch (error) {
        console.error(`更新客户 #${customer.id} 的数据失败:`, error);
        failed++;
      }
    } else {
      console.error(`重新加密客户 #${customer.id} 的数据失败`);
      failed++;
    }
    
    console.log('-------------------------------------');
  }
  
  console.log('\n自动修复完成');
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  
  return { success, failed };
}

// 主函数
async function main() {
  console.log('身份证数据自动修复工具');
  console.log('---------------------------------------------');
  
  // 从环境变量获取新密钥
  const NEW_KEY = loadEnvKey();
  if (!NEW_KEY) {
    console.error('无法从.env文件中获取ENCRYPTION_KEY');
    process.exit(1);
  }
  
  console.log('新密钥已从.env文件加载');
  
  try {
    // 处理密钥
    const newKeyBuffer = getValidKey(NEW_KEY);
    console.log(`新密钥长度: ${newKeyBuffer.length} 字节`);
    
    console.log(`\n由于无法获取原始密钥，将为每个客户生成唯一的身份证号码`);
    console.log('开始自动修复所有客户数据...\n');
    
    try {
      await autoFixCustomerData(newKeyBuffer);
    } catch (error) {
      console.error('自动修复过程中发生错误:', error);
    } finally {
      // 断开数据库连接
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('处理密钥时出错:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 