// 修复无效的证件号码格式
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 从环境变量获取加密密钥
require('dotenv').config();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// 证件类型枚举
const IdCardType = {
  CHINA_MAINLAND: 'CHINA_MAINLAND',
  PASSPORT: 'PASSPORT',
  HONG_KONG_ID: 'HONG_KONG_ID',
  FOREIGN_ID: 'FOREIGN_ID'
};

// 复制自encryption.ts的相关函数
const IV_LENGTH = 16;

function getValidKey(key) {
  if (!key) {
    throw new Error('ENCRYPTION_KEY 环境变量必须设置');
  }
  
  let keyBuffer;
  
  try {
    // 检查是否是Base64格式
    if (key.match(/^[A-Za-z0-9+/=]+$/) && key.length % 4 === 0) {
      keyBuffer = Buffer.from(key, 'base64');
      console.log('检测到Base64格式密钥，已解码为字节数组');
    } else {
      let validKey = key;
      if (key.length < 32) {
        validKey = key.padEnd(32, key);
      } else if (key.length > 32) {
        validKey = key.substring(0, 32);
      }
      
      keyBuffer = Buffer.from(validKey);
    }
    
    if (keyBuffer.length !== 32) {
      console.warn(`警告: 密钥长度(${keyBuffer.length})不是32字节，将进行调整`);
      
      if (keyBuffer.length < 32) {
        const newBuffer = Buffer.alloc(32);
        keyBuffer.copy(newBuffer);
        const paddingByte = 32 - keyBuffer.length;
        for (let i = keyBuffer.length; i < 32; i++) {
          newBuffer[i] = paddingByte;
        }
        keyBuffer = newBuffer;
      } else {
        keyBuffer = keyBuffer.slice(0, 32);
      }
    }
    
    return keyBuffer;
  } catch (error) {
    console.error('处理密钥时出错');
    throw new Error('密钥处理失败');
  }
}

// 获取加密密钥
const currentKey = getValidKey(ENCRYPTION_KEY);

// 加密函数
function encryptIdCard(text) {
  try {
    if (!text || text.trim() === '') {
      console.warn('警告: 尝试加密空的身份证号码');
      return 'EMPTY_INPUT';
    }
    
    text = text.trim();
    
    if (text.length < 5) {
      console.warn(`警告: 证件号码长度不足(${text.length})`);
      throw new Error('证件号码长度不足');
    }
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', currentKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const result = iv.toString('hex') + ':' + encrypted.toString('hex');
    console.log(`证件号码加密成功，长度: ${result.length}`);
    
    return result;
  } catch (error) {
    console.error('加密证件号码失败:', error);
    throw new Error('加密失败，请稍后重试');
  }
}

// 检查是否是有效的加密格式
function isValidEncryptedFormat(text) {
  if (!text) return false;
  
  if (!text.includes(':')) return false;
  
  const parts = text.split(':');
  
  if (parts.length !== 2) return false;
  
  const [ivHex, dataHex] = parts;
  
  if (!/^[0-9a-f]+$/i.test(ivHex) || ivHex.length !== IV_LENGTH * 2) return false;
  
  if (!/^[0-9a-f]+$/i.test(dataHex)) return false;
  
  return true;
}

// 生成哈希，用于查询
function hashIdCard(text, idCardType = IdCardType.CHINA_MAINLAND) {
  try {
    if (!text) return '';
    
    const textWithType = `${idCardType}:${text.trim()}`;
    
    const hash = crypto.createHash('sha256');
    hash.update(textWithType);
    return hash.digest('hex');
  } catch (error) {
    console.error('计算哈希值失败:', error);
    return `fallback_hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

async function fixInvalidIdCardFormats() {
  console.log('开始修复无效的证件号码格式...');
  
  try {
    // 1. 查找所有不包含冒号分隔符的证件号码（可能是明文或格式无效）
    const invalidRecords = await prisma.customer.findMany({
      where: {
        idCardNumberEncrypted: { not: null },
        NOT: { idCardNumberEncrypted: { contains: ':' } }
      },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
        idCardHash: true,
        idCardType: true
      }
    });
    
    console.log(`找到 ${invalidRecords.length} 条需要修复的记录。`);
    
    // 2. 逐个修复记录
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const record of invalidRecords) {
      console.log(`\n处理客户 ID: ${record.id}, 姓名: ${record.name}`);
      console.log(`当前证件号码: ${record.idCardNumberEncrypted}`);
      console.log(`当前证件类型: ${record.idCardType || 'CHINA_MAINLAND'}`);
      
      // 获取证件类型，如果未设置则使用默认值
      const idCardType = record.idCardType || IdCardType.CHINA_MAINLAND;
      
      try {
        // 检查原始数据是否有效
        let originalNumber = record.idCardNumberEncrypted;
        
        if (!originalNumber || originalNumber.trim() === '') {
          console.log('证件号码为空，跳过此记录');
          skippedCount++;
          continue;
        }
        
        // 规范化证件号码（移除空格，转大写）
        originalNumber = originalNumber.trim().toUpperCase();
        
        // 如果已经是有效的加密格式，则跳过
        if (isValidEncryptedFormat(originalNumber)) {
          console.log('已经是有效的加密格式，跳过此记录');
          skippedCount++;
          continue;
        }
        
        // 进行加密处理
        console.log(`对明文证件号 ${originalNumber} 进行加密...`);
        const encryptedNumber = encryptIdCard(originalNumber);
        
        // 检查加密结果
        if (!isValidEncryptedFormat(encryptedNumber)) {
          console.log('加密后的格式仍然无效，可能是加密过程出错，跳过此记录');
          skippedCount++;
          continue;
        }
        
        // 生成哈希值
        const hashedNumber = hashIdCard(originalNumber, idCardType);
        
        // 更新记录
        await prisma.customer.update({
          where: { id: record.id },
          data: {
            idCardNumberEncrypted: encryptedNumber,
            idCardHash: hashedNumber,
            idCardType: idCardType
          }
        });
        
        console.log(`成功修复客户 ID: ${record.id} 的证件号码`);
        console.log(`新的加密格式: ${encryptedNumber.substring(0, 20)}...`);
        console.log(`新的哈希值: ${hashedNumber.substring(0, 10)}...`);
        fixedCount++;
      } catch (error) {
        console.error(`处理客户 ID: ${record.id} 时发生错误:`, error);
        skippedCount++;
      }
    }
    
    console.log('\n修复完成!');
    console.log(`成功修复: ${fixedCount} 条记录`);
    console.log(`跳过: ${skippedCount} 条记录`);
    
  } catch (error) {
    console.error('脚本执行过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行修复
fixInvalidIdCardFormats()
  .then(() => console.log('脚本执行完成'))
  .catch(e => console.error('脚本执行失败:', e)); 