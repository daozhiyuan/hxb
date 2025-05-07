/**
 * 全局身份证数据修复脚本
 * 一次性修复所有客户的身份证加密数据
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
  
  // 检查加密文本长度 - 确保不是太短
  if (parts[1].length < 10) return false;
  
  return true;
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

/**
 * 主函数 - 修复所有客户的身份证数据
 */
async function fixAllIdCards() {
  try {
    console.log('开始执行全局数据修复...');

    // 获取所有客户数据
    const customers = await prisma.customer.findMany({
      where: {
        idCardNumberEncrypted: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
        idCardHash: true
      }
    });

    console.log(`共找到 ${customers.length} 个有身份证数据的客户`);
    
    const results = {
      total: customers.length,
      alreadyValid: 0,
      fixed: 0,
      resetToTemp: 0,
      failed: 0,
      details: []
    };

    // 处理每个客户
    for (const customer of customers) {
      console.log(`\n处理客户: ID ${customer.id}, 姓名: ${customer.name}`);
      console.log(`当前加密数据: ${customer.idCardNumberEncrypted}`);
      
      try {
        // 第一步: 检查格式是否有效
        const isValid = isValidEncryptedFormat(customer.idCardNumberEncrypted);
        console.log(`格式是否有效: ${isValid ? '是' : '否'}`);
        
        if (isValid) {
          // 第二步: 如果格式有效，尝试解密
          try {
            const decrypted = decryptIdCard(customer.idCardNumberEncrypted);
            
            // 如果解密结果包含错误信息，需要重置
            if (decrypted.includes('错误') || decrypted.includes('失败') || decrypted.includes('无效')) {
              console.log(`格式有效但解密失败，将重置数据`);
              
              // 重置为临时数据
              const tempIdCard = "000000000000000000";
              const encryptedTemp = encryptIdCard(tempIdCard);
              
              await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  idCardNumberEncrypted: encryptedTemp,
                  idCardHash: null
                }
              });
              
              console.log(`已重置为临时数据: ${encryptedTemp}`);
              results.resetToTemp++;
              results.details.push({
                id: customer.id,
                name: customer.name,
                status: 'reset_to_temp',
                message: '格式有效但解密失败，已重置为临时数据'
              });
            } else {
              // 解密成功，数据有效
              console.log(`解密成功，数据有效: ${decrypted.substring(0, 4)}******`);
              results.alreadyValid++;
              results.details.push({
                id: customer.id,
                name: customer.name,
                status: 'already_valid',
                message: '数据格式和内容均有效'
              });
            }
          } catch (error) {
            // 解密过程出错，重置为临时数据
            console.error(`解密过程出错:`, error);
            
            const tempIdCard = "000000000000000000";
            const encryptedTemp = encryptIdCard(tempIdCard);
            
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                idCardNumberEncrypted: encryptedTemp,
                idCardHash: null
              }
            });
            
            console.log(`解密错误，已重置为临时数据: ${encryptedTemp}`);
            results.resetToTemp++;
            results.details.push({
              id: customer.id,
              name: customer.name,
              status: 'reset_to_temp',
              message: '解密过程出错，已重置为临时数据'
            });
          }
        } else {
          // 格式无效，检查是否可能是未加密的身份证号码
          const idCardPattern = /^\d{17}[\dX]$/i;
          if (idCardPattern.test(customer.idCardNumberEncrypted)) {
            // 直接是身份证号码，重新加密
            const plainIdCard = customer.idCardNumberEncrypted;
            const encryptedData = encryptIdCard(plainIdCard);
            
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                idCardNumberEncrypted: encryptedData,
                // 此处可以同时更新哈希值
              }
            });
            
            console.log(`发现未加密的身份证号码，已重新加密: ${encryptedData}`);
            results.fixed++;
            results.details.push({
              id: customer.id,
              name: customer.name,
              status: 'fixed',
              message: '发现未加密的身份证号码，已重新加密'
            });
          } else {
            // 格式无效且不是身份证号码，重置为临时数据
            const tempIdCard = "000000000000000000";
            const encryptedTemp = encryptIdCard(tempIdCard);
            
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                idCardNumberEncrypted: encryptedTemp,
                idCardHash: null
              }
            });
            
            console.log(`格式无效，已重置为临时数据: ${encryptedTemp}`);
            results.resetToTemp++;
            results.details.push({
              id: customer.id,
              name: customer.name,
              status: 'reset_to_temp',
              message: '格式无效，已重置为临时数据'
            });
          }
        }
      } catch (error) {
        console.error(`处理客户 ID ${customer.id} 时发生错误:`, error);
        results.failed++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'failed',
          message: '处理过程中发生错误'
        });
      }
    }

    // 输出汇总结果
    console.log('\n========== 修复结果汇总 ==========');
    console.log(`总客户数: ${results.total}`);
    console.log(`已有效数据: ${results.alreadyValid}`);
    console.log(`已修复数据: ${results.fixed}`);
    console.log(`重置为临时数据: ${results.resetToTemp}`);
    console.log(`处理失败: ${results.failed}`);
    
    // 输出需要手动设置的客户列表
    console.log('\n需要手动设置身份证号码的客户:');
    const needManualFix = results.details.filter(d => d.status === 'reset_to_temp');
    if (needManualFix.length > 0) {
      needManualFix.forEach(c => {
        console.log(`- ID: ${c.id}, 姓名: ${c.name}`);
      });
    } else {
      console.log('没有需要手动设置的客户');
    }

    console.log('\n修复完成！');

  } catch (error) {
    console.error('修复过程中发生错误:', error);
  } finally {
    // 关闭Prisma连接
    await prisma.$disconnect();
  }
}

// 执行修复
fixAllIdCards(); 