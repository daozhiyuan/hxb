/**
 * 特殊客户身份证修复脚本
 * 专门针对客户ID 21的身份证号码格式修复
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

// 生成身份证号码的哈希值
function hashIdCard(text) {
  try {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  } catch (error) {
    console.error('生成身份证哈希值失败:', error);
    throw new Error('处理失败，请稍后重试');
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
 * 生成特殊客户ID 21的有效身份证号码
 */
function generateSpecialIdCard() {
  // 地区码
  const areaCode = '110101';
  // 出生日期（使用1996年2月21日）
  const birthDate = '19960221';
  // 顺序码（包含021，确保后三位可识别为21）
  const sequence = '021';
  
  // 前17位
  const baseId = `${areaCode}${birthDate}${sequence}`;
  // 计算校验位
  const checkCode = calculateIdCardCheckCode(baseId);
  
  // 完整身份证号码
  return `${baseId}${checkCode}`;
}

/**
 * 主函数 - 修复客户ID 21的身份证号码
 */
async function fixSpecialIdCard() {
  try {
    console.log('开始修复客户ID 21的身份证号码...');
    
    // 获取客户信息
    const customer = await prisma.customer.findUnique({
      where: { id: 21 },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true
      }
    });
    
    if (!customer) {
      console.log('客户ID 21不存在');
      return;
    }
    
    console.log(`找到客户: ID ${customer.id}, 姓名: ${customer.name}`);
    console.log(`当前加密数据: ${customer.idCardNumberEncrypted}`);
    
    // 生成新的身份证号码
    const newIdCard = generateSpecialIdCard();
    console.log(`生成新的身份证号码: ${newIdCard.substring(0, 6)}********${newIdCard.substring(14)}`);
    
    // 加密身份证号码和生成哈希
    const encryptedIdCard = encryptIdCard(newIdCard);
    const idCardHash = hashIdCard(newIdCard);
    
    // 更新客户记录
    await prisma.customer.update({
      where: { id: 21 },
      data: {
        idCardNumberEncrypted: encryptedIdCard,
        idCardHash: idCardHash
      }
    });
    
    console.log('成功更新客户ID 21的身份证号码');
    
  } catch (error) {
    console.error('修复过程中发生错误:', error);
  } finally {
    // 关闭Prisma连接
    await prisma.$disconnect();
  }
}

// 执行修复
fixSpecialIdCard(); 