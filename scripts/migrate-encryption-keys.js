#!/usr/bin/env node

/**
 * 加密密钥迁移工具
 * 
 * 这个脚本将使用新的32字节密钥重新加密用户敏感数据。
 * 脚本会先尝试用旧密钥解密数据，然后用新密钥重新加密。
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const readline = require('readline');

// 引用我们的验证脚本提供一些验证功能
const IV_LENGTH = 16;
const prisma = new PrismaClient();

// 从环境变量获取加密密钥
const NEW_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const OLD_ENCRYPTION_KEY = process.env.OLD_ENCRYPTION_KEY;

// 显示密钥信息
console.log('=== 加密密钥迁移工具 ===\n');

if (!NEW_ENCRYPTION_KEY) {
  console.error('错误: ENCRYPTION_KEY 环境变量未设置');
  process.exit(1);
}

if (!OLD_ENCRYPTION_KEY) {
  console.error('错误: OLD_ENCRYPTION_KEY 环境变量未设置');
  process.exit(1);
}

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

// 尝试用给定密钥解密
function tryDecryptWithKey(text, key) {
  try {
    if (!text) return { success: false, result: '空数据' };
    
    // 检查是否是有效的身份证号码格式
    if (/^\d{17}[\dX]$/i.test(text)) {
      return { success: true, result: text, wasPlaintext: true };
    }
    
    const textParts = text.split(':');
    
    // 格式检查
    if (textParts.length !== 2) {
      return { success: false, result: '格式错误' };
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    // 检查IV长度是否为16字节
    if (iv.length !== IV_LENGTH) {
      return { success: false, result: 'IV长度错误' };
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const result = decrypted.toString();
    
    // 验证解密结果是否有效
    if (!result || result.length < 5) {
      return { success: false, result: '解密结果无效' };
    }
    
    return { success: true, result, wasPlaintext: false };
  } catch (error) {
    return { success: false, result: '解密失败: ' + error.message };
  }
}

// 加密数据
function encryptWithKey(text, key) {
  try {
    if (!text) return '';
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('加密失败:', error.message);
    return null;
  }
}

// 确认用户是否要继续
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 获取新旧密钥
const newKey = getValidKey(NEW_ENCRYPTION_KEY);
const oldKey = getValidKey(OLD_ENCRYPTION_KEY);

// 验证密钥长度
console.log('新密钥信息:');
console.log(`- 密钥长度: ${newKey.length} 字节`);

console.log('\n旧密钥信息:');
console.log(`- 密钥长度: ${oldKey.length} 字节`);

console.log('\n此工具将尝试重新加密以下表的数据:');
console.log('1. Customer (idCard字段)');
console.log('2. Appeal (idCard字段)');
console.log('3. IdCardHistory (idCard字段)');

rl.question('\n警告: 此操作将修改数据库中的加密数据。\n是否继续？(y/n) ', async (answer) => {
  if (answer.toLowerCase() !== 'y') {
    console.log('操作已取消');
    rl.close();
    process.exit(0);
  }
  
  console.log('\n开始迁移加密数据...\n');
  
  try {
    // 迁移Customer表
    console.log('处理Customer表...');
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        idCard: true
      }
    });
    
    console.log(`发现 ${customers.length} 条客户记录`);
    let customerSuccess = 0;
    let customerSkipped = 0;
    let customerFailed = 0;
    
    for (const customer of customers) {
      if (!customer.idCard) {
        customerSkipped++;
        continue;
      }
      
      // 尝试用旧密钥解密
      const decryptResult = tryDecryptWithKey(customer.idCard, oldKey);
      
      // 如果解密成功或者是明文，用新密钥加密
      if (decryptResult.success) {
        try {
          // 如果是明文数据或已成功解密，使用新密钥重新加密
          const newEncrypted = encryptWithKey(decryptResult.result, newKey);
          
          if (newEncrypted) {
            // 更新数据库
            await prisma.customer.update({
              where: { id: customer.id },
              data: { idCard: newEncrypted }
            });
            customerSuccess++;
          } else {
            console.error(`客户ID ${customer.id} 加密失败`);
            customerFailed++;
          }
        } catch (error) {
          console.error(`客户ID ${customer.id} 更新失败:`, error.message);
          customerFailed++;
        }
      } else {
        // 如果旧密钥解密失败，尝试用新密钥解密
        const newKeyResult = tryDecryptWithKey(customer.idCard, newKey);
        if (newKeyResult.success) {
          console.log(`客户ID ${customer.id} 已使用新密钥加密，跳过`);
          customerSkipped++;
        } else {
          console.error(`客户ID ${customer.id} 解密失败: ${decryptResult.result}`);
          customerFailed++;
        }
      }
    }
    
    console.log(`Customer表处理完成: 成功=${customerSuccess}, 跳过=${customerSkipped}, 失败=${customerFailed}\n`);
    
    // 迁移Appeal表
    console.log('处理Appeal表...');
    const appeals = await prisma.appeal.findMany({
      select: {
        id: true,
        idCard: true
      }
    });
    
    console.log(`发现 ${appeals.length} 条申诉记录`);
    let appealSuccess = 0;
    let appealSkipped = 0;
    let appealFailed = 0;
    
    for (const appeal of appeals) {
      if (!appeal.idCard) {
        appealSkipped++;
        continue;
      }
      
      // 尝试用旧密钥解密
      const decryptResult = tryDecryptWithKey(appeal.idCard, oldKey);
      
      // 如果解密成功或者是明文，用新密钥加密
      if (decryptResult.success) {
        try {
          // 如果是明文数据或已成功解密，使用新密钥重新加密
          const newEncrypted = encryptWithKey(decryptResult.result, newKey);
          
          if (newEncrypted) {
            // 更新数据库
            await prisma.appeal.update({
              where: { id: appeal.id },
              data: { idCard: newEncrypted }
            });
            appealSuccess++;
          } else {
            console.error(`申诉ID ${appeal.id} 加密失败`);
            appealFailed++;
          }
        } catch (error) {
          console.error(`申诉ID ${appeal.id} 更新失败:`, error.message);
          appealFailed++;
        }
      } else {
        // 如果旧密钥解密失败，尝试用新密钥解密
        const newKeyResult = tryDecryptWithKey(appeal.idCard, newKey);
        if (newKeyResult.success) {
          console.log(`申诉ID ${appeal.id} 已使用新密钥加密，跳过`);
          appealSkipped++;
        } else {
          console.error(`申诉ID ${appeal.id} 解密失败: ${decryptResult.result}`);
          appealFailed++;
        }
      }
    }
    
    console.log(`Appeal表处理完成: 成功=${appealSuccess}, 跳过=${appealSkipped}, 失败=${appealFailed}\n`);
    
    // 迁移IdCardHistory表
    console.log('处理IdCardHistory表...');
    const histories = await prisma.idCardHistory.findMany({
      select: {
        id: true,
        idCard: true
      }
    });
    
    console.log(`发现 ${histories.length} 条身份证历史记录`);
    let historySuccess = 0;
    let historySkipped = 0;
    let historyFailed = 0;
    
    for (const history of histories) {
      if (!history.idCard) {
        historySkipped++;
        continue;
      }
      
      // 尝试用旧密钥解密
      const decryptResult = tryDecryptWithKey(history.idCard, oldKey);
      
      // 如果解密成功或者是明文，用新密钥加密
      if (decryptResult.success) {
        try {
          // 如果是明文数据或已成功解密，使用新密钥重新加密
          const newEncrypted = encryptWithKey(decryptResult.result, newKey);
          
          if (newEncrypted) {
            // 更新数据库
            await prisma.idCardHistory.update({
              where: { id: history.id },
              data: { idCard: newEncrypted }
            });
            historySuccess++;
          } else {
            console.error(`历史记录ID ${history.id} 加密失败`);
            historyFailed++;
          }
        } catch (error) {
          console.error(`历史记录ID ${history.id} 更新失败:`, error.message);
          historyFailed++;
        }
      } else {
        // 如果旧密钥解密失败，尝试用新密钥解密
        const newKeyResult = tryDecryptWithKey(history.idCard, newKey);
        if (newKeyResult.success) {
          console.log(`历史记录ID ${history.id} 已使用新密钥加密，跳过`);
          historySkipped++;
        } else {
          console.error(`历史记录ID ${history.id} 解密失败: ${decryptResult.result}`);
          historyFailed++;
        }
      }
    }
    
    console.log(`IdCardHistory表处理完成: 成功=${historySuccess}, 跳过=${historySkipped}, 失败=${historyFailed}\n`);
    
    // 汇总结果
    console.log('====== 迁移汇总 ======');
    console.log(`Customer表: 总数=${customers.length}, 成功=${customerSuccess}, 跳过=${customerSkipped}, 失败=${customerFailed}`);
    console.log(`Appeal表: 总数=${appeals.length}, 成功=${appealSuccess}, 跳过=${appealSkipped}, 失败=${appealFailed}`);
    console.log(`IdCardHistory表: 总数=${histories.length}, 成功=${historySuccess}, 跳过=${historySkipped}, 失败=${historyFailed}`);
    
    const totalSuccess = customerSuccess + appealSuccess + historySuccess;
    const totalSkipped = customerSkipped + appealSkipped + historySkipped;
    const totalFailed = customerFailed + appealFailed + historyFailed;
    const totalRecords = customers.length + appeals.length + histories.length;
    
    console.log(`总计: 总数=${totalRecords}, 成功=${totalSuccess}, 跳过=${totalSkipped}, 失败=${totalFailed}`);
    
    if (totalFailed === 0) {
      console.log('\n✅ 所有数据已成功迁移到新密钥');
    } else {
      console.log('\n⚠️ 部分数据迁移失败，请检查日志');
    }
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}); 