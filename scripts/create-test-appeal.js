/**
 * 创建测试申诉记录
 * 
 * 此脚本用于创建测试申诉记录，包含不同证件类型的记录
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
require('dotenv').config();

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 加密相关常量
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('错误: 未找到加密密钥！请确保ENCRYPTION_KEY环境变量已设置。');
  process.exit(1);
}

console.log('加密密钥已配置');
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

// 加密证件号码 - 普通加密
function encryptIdCard(text) {
  try {
    if (!text) return '';
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('加密证件号码失败:', error);
    return '';
  }
}

// 双重加密 - 先加密再Base64
function doubleEncrypt(text) {
  try {
    if (!text) return '';
    
    // 第一层加密
    const encrypted = encryptIdCard(text);
    
    // 第二层加密 - Base64编码
    return Buffer.from(encrypted).toString('base64');
  } catch (error) {
    console.error('双重加密失败:', error);
    return '';
  }
}

// 新增：加密原始字节流并进行Base64编码
function encryptRawAndBase64(text) {
  try {
    if (!text) return '';
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    
    // 将 IV 和 加密数据 合并，然后进行Base64编码
    const rawEncryptedData = Buffer.concat([iv, encrypted]);
    return rawEncryptedData.toString('base64');
  } catch (error) {
    console.error('Raw Base64加密失败:', error);
    return '';
  }
}

// 测试数据
const testAppeals = [
  {
    customerName: '张三',
    idCardType: 'CHINA_MAINLAND',
    idNumber: '110101199001011234', // 大陆身份证
    reason: '测试大陆身份证 - 普通加密',
    partnerId: 1
  },
  {
    customerName: '李四',
    idCardType: 'PASSPORT',
    idNumber: 'E12345678', // 护照
    reason: '测试护照 - 普通加密',
    partnerId: 1
  },
  {
    customerName: '王五',
    idCardType: 'HONG_KONG_ID',
    idNumber: 'A123456(7)', // 香港身份证
    reason: '测试香港身份证 - 普通加密',
    partnerId: 1
  },
  {
    customerName: '赵六',
    idCardType: 'FOREIGN_ID',
    idNumber: 'ABCD1234567', // 外国身份证
    reason: '测试外国身份证 - 普通加密',
    partnerId: 1
  },
  {
    customerName: '张三二重',
    idCardType: 'CHINA_MAINLAND',
    idNumber: '110101199001011234', // 双重加密
    reason: '测试大陆身份证 - 双重加密',
    partnerId: 1
  },
  {
    customerName: '王五RawBase64', // 新增测试用例
    idCardType: 'HONG_KONG_ID',
    idNumber: 'R987654(3)', 
    reason: '测试香港身份证 - Raw Base64加密',
    partnerId: 1
  }
];

// 创建测试申诉
async function createTestAppeals() {
  try {
    console.log('开始创建测试申诉记录...');
    
    // 先清理旧的测试记录
    await prisma.appeal.deleteMany({
      where: {
        customerName: {
          in: testAppeals.map(a => a.customerName)
        }
      }
    });
    console.log('已清理旧的测试记录');
    
    // 创建新记录
    for (const appeal of testAppeals) {
      // 选择加密方式
      let encryptedIdNumber;
      if (appeal.customerName.includes('二重')) {
        console.log(`为 ${appeal.customerName} 创建双重加密数据`);
        encryptedIdNumber = doubleEncrypt(appeal.idNumber);
        console.log(`原始数据: ${appeal.idNumber}`);
        console.log(`双重加密结果: ${encryptedIdNumber}`);
      } else if (appeal.customerName.includes('RawBase64')) { // 新增：Base64编码的原始加密字节流
         console.log(`为 ${appeal.customerName} 创建Raw Base64加密数据`);
         encryptedIdNumber = encryptRawAndBase64(appeal.idNumber);
         console.log(`原始数据: ${appeal.idNumber}`);
         console.log(`Raw Base64加密结果: ${encryptedIdNumber}`);
      } else {
        console.log(`为 ${appeal.customerName} 创建普通加密数据`);
        encryptedIdNumber = encryptIdCard(appeal.idNumber);
        console.log(`原始数据: ${appeal.idNumber}`);
        console.log(`加密结果: ${encryptedIdNumber}`);
      }
      
      // 创建哈希值（修复唯一性问题）
      // 使用证件类型 + 证件号码 + 客户名（一部分）来确保哈希的唯一性
      const uniqueStringForHash = `${appeal.idCardType}-${appeal.idNumber}-${appeal.customerName.slice(0, 5)}`;
      const idNumberHash = crypto.createHash('sha256').update(uniqueStringForHash).digest('hex');
      
      // 创建申诉记录
      const createdAppeal = await prisma.appeal.create({
        data: {
          customerName: appeal.customerName,
          idCardType: appeal.idCardType,
          idNumber: encryptedIdNumber,
          idNumberHash: idNumberHash,
          reason: appeal.reason,
          status: 'PENDING',
          partnerId: appeal.partnerId,
        }
      });
      
      console.log(`创建申诉记录成功，ID: ${createdAppeal.id}`);
    }
    
    console.log('所有测试记录创建完成！');
  } catch (error) {
    console.error('创建测试记录失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行创建函数
createTestAppeals(); 