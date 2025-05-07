/**
 * 重新加密所有客户数据
 * 
 * 此脚本用于重新加密数据库中的身份证号码数据
 * 1. 尝试使用旧密钥解密原始数据
 * 2. 使用新密钥重新加密数据
 * 3. 更新数据库中的记录
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 定义常量
const IV_LENGTH = 16;
let ORIGINAL_KEY = ''; // 将在稍后从用户输入获取
let NEW_KEY = process.env.ENCRYPTION_KEY; // 从环境变量中获取新密钥

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

// 检查加密数据格式是否有效
function isValidEncryptedFormat(text) {
  if (!text) return false;
  
  // 检查是否是冒号分隔的Hex格式（标准格式）
  const parts = text.split(':');
  if (parts.length === 2) {
    // 检查IV部分是否为有效的hex字符串 - 应为32个字符(16字节)
    const ivRegex = /^[0-9a-f]{32}$/i;
    if (!ivRegex.test(parts[0])) return false;
    
    // 检查加密文本部分是否为有效的hex字符串
    const encTextRegex = /^[0-9a-f]+$/i;
    if (!encTextRegex.test(parts[1])) return false;
    
    return true;
  }
  
  // 检查是否是Base64编码格式
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (base64Regex.test(text) && text.length > 20) {
    return true;
  }
  
  return false;
}

// 使用原始密钥解密
function decryptWithOriginalKey(text, originalKeyBuffer) {
  try {
    if (!text || !originalKeyBuffer) return null;
    
    // 检查格式是否有效
    if (!isValidEncryptedFormat(text)) {
      console.warn('数据格式不符合加密标准，可能是未加密数据');
      
      // 检查是否可能是有效的身份证号码（简单验证）
      const idCardPattern = /^\d{17}[\dX]$/;
      if (idCardPattern.test(text)) {
        console.log('数据看起来像未加密的身份证号码，直接返回');
        return text;
      }
      
      return null;
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
        if (buffer.length <= 16) {
          console.error('Base64数据格式无效: 长度不足');
          return null;
        }
        
        const iv = buffer.slice(0, 16);
        const encryptedData = buffer.slice(16);
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', originalKeyBuffer, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
      } catch (error) {
        console.error('解密Base64格式数据失败:', error);
        return null;
      }
    }
    
    // 尝试标准的hex格式解密
    try {
      // 分割IV和加密数据
      const parts = text.split(':');
      
      // 确保有两部分
      if (parts.length !== 2) {
        return null;
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      
      // 检查IV长度
      if (iv.length !== IV_LENGTH) {
        console.warn(`IV长度不正确: ${iv.length}，预期: ${IV_LENGTH}`);
        return null;
      }
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', originalKeyBuffer, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString();
    } catch (error) {
      console.error('解密十六进制格式数据失败:', error);
      return null;
    }
  } catch (error) {
    console.error('解密数据失败:', error);
    return null;
  }
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

// 重新加密所有客户数据
async function reencryptCustomerData(originalKeyBuffer, newKeyBuffer) {
  const customers = await prisma.customer.findMany({
    where: {
      idCardNumberEncrypted: {
        not: null
      }
    },
    select: {
      id: true,
      name: true,
      idCardNumberEncrypted: true
    }
  });
  
  console.log(`找到 ${customers.length} 个有加密身份证数据的客户`);
  
  // 计数器
  let success = 0;
  let failed = 0;
  let notNeeded = 0;
  
  for (const customer of customers) {
    console.log(`处理客户 #${customer.id} (${customer.name})...`);
    
    // 尝试使用原始密钥解密
    const decrypted = decryptWithOriginalKey(customer.idCardNumberEncrypted, originalKeyBuffer);
    
    if (decrypted) {
      console.log(`成功解密客户 #${customer.id} 的身份证号码`);
      
      // 验证解密结果是否是有效的身份证号码
      const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/i;
      const isValidIdCard = idCardPattern.test(decrypted);
      
      if (isValidIdCard) {
        console.log(`客户 #${customer.id} 的身份证号码有效`);
        
        // 使用新密钥重新加密
        const reencrypted = encryptWithNewKey(decrypted, newKeyBuffer);
        const hash = hashIdCard(decrypted);
        
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
      } else {
        console.warn(`客户 #${customer.id} 的解密结果不是有效的身份证号码: ${decrypted}`);
        failed++;
      }
    } else {
      console.error(`无法解密客户 #${customer.id} 的身份证号码`);
      failed++;
    }
    
    console.log('-------------------------------------');
  }
  
  console.log('\n重新加密完成');
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  console.log(`无需处理: ${notNeeded}`);
  
  return { success, failed, notNeeded };
}

// 主函数
async function main() {
  console.log('身份证数据重新加密工具');
  console.log('---------------------------------------------');
  
  // 从环境变量获取新密钥
  NEW_KEY = loadEnvKey();
  if (!NEW_KEY) {
    console.error('无法从.env文件中获取ENCRYPTION_KEY');
    process.exit(1);
  }
  
  console.log('新密钥已从.env文件加载');
  
  // 创建readline接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // 询问原始密钥
  rl.question('请输入原始加密密钥: ', async (answer) => {
    ORIGINAL_KEY = answer.trim();
    
    if (!ORIGINAL_KEY) {
      console.error('原始密钥不能为空');
      rl.close();
      process.exit(1);
    }
    
    try {
      // 处理密钥
      const originalKeyBuffer = getValidKey(ORIGINAL_KEY);
      const newKeyBuffer = getValidKey(NEW_KEY);
      
      console.log(`原始密钥长度: ${originalKeyBuffer.length} 字节`);
      console.log(`新密钥长度: ${newKeyBuffer.length} 字节`);
      
      // 询问是否继续
      rl.question('\n这将重新加密所有客户的身份证数据，是否继续? (y/n) ', async (confirm) => {
        if (confirm.toLowerCase() === 'y') {
          console.log('\n开始重新加密所有客户数据...\n');
          
          try {
            await reencryptCustomerData(originalKeyBuffer, newKeyBuffer);
          } catch (error) {
            console.error('重新加密过程中发生错误:', error);
          } finally {
            // 断开数据库连接
            await prisma.$disconnect();
          }
        } else {
          console.log('操作已取消');
        }
        
        rl.close();
      });
    } catch (error) {
      console.error('处理密钥时出错:', error);
      rl.close();
      process.exit(1);
    }
  });
}

// 执行主函数
main(); 