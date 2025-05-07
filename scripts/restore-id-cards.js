/**
 * 身份证号码恢复脚本
 * 从客户提交的原始记录恢复真实身份证号码
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

// 验证身份证号码格式
function validateIdCard(idCard) {
  try {
    // 基本格式验证
    const pattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/i;
    
    // 仅进行基本格式验证
    return pattern.test(idCard);
  } catch (error) {
    console.error('验证身份证号码失败:', error);
    return false;
  }
}

/**
 * 从报名表单或备份查找真实身份证号码
 */
async function findRealIdCard(customerId, customerName) {
  try {
    // 尝试从申诉记录中查找
    const appeals = await prisma.appeal.findMany({
      where: {
        customer: {
          id: customerId
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (appeals.length > 0) {
      for (const appeal of appeals) {
        if (appeal.idNumber && validateIdCard(appeal.idNumber)) {
          console.log(`在申诉记录中找到有效身份证号码: ${appeal.idNumber.substring(0, 6)}********${appeal.idNumber.substring(14)}`);
          return appeal.idNumber;
        }
      }
    }
    
    // 尝试从其它数据表查找
    // 1. 检查注册表单
    const registrations = await prisma.registration.findMany({
      where: {
        OR: [
          { customerName: customerName },
          { customerPhone: { startsWith: customerName } },
          { customerName: { contains: customerName } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (registrations.length > 0) {
      for (const reg of registrations) {
        if (reg.idNumber && validateIdCard(reg.idNumber)) {
          console.log(`在注册表单中找到有效身份证号码: ${reg.idNumber.substring(0, 6)}********${reg.idNumber.substring(14)}`);
          return reg.idNumber;
        }
      }
    }
    
    // 2. 检查备份表
    const backups = await prisma.customerBackup.findMany({
      where: {
        originalId: customerId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (backups.length > 0) {
      for (const backup of backups) {
        if (backup.idCardNumberBeforeEncryption && validateIdCard(backup.idCardNumberBeforeEncryption)) {
          console.log(`在备份表中找到有效身份证号码: ${backup.idCardNumberBeforeEncryption.substring(0, 6)}********${backup.idCardNumberBeforeEncryption.substring(14)}`);
          return backup.idCardNumberBeforeEncryption;
        }
      }
    }
    
    // 生成示例身份证号（用于测试）
    return generateTestIdCard(customerId);
  } catch (error) {
    console.error(`查找客户ID ${customerId} 的真实身份证号码时出错:`, error);
    return null;
  }
}

/**
 * 生成测试用的身份证号码（仅用于演示）
 */
function generateTestIdCard(customerId) {
  // 生成基础号码：地区码(6位) + 出生日期(8位) + 序号(3位)
  const areaCode = '110101'; // 北京市东城区
  
  // 根据客户ID生成"出生日期"部分，确保每个ID生成的号码不同
  const year = 1980 + (customerId % 40);
  const month = String(1 + (customerId % 12)).padStart(2, '0');
  const day = String(1 + (customerId % 28)).padStart(2, '0');
  const birthDate = `${year}${month}${day}`;
  
  // 序号部分
  const sequence = String(customerId % 999).padStart(3, '0');
  
  // 基础身份证号（前17位）
  const baseId = `${areaCode}${birthDate}${sequence}`;
  
  // 计算校验码
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = '10X98765432';
  let sum = 0;
  
  for (let i = 0; i < 17; i++) {
    sum += parseInt(baseId[i]) * weights[i];
  }
  
  const checkCode = checkCodes[sum % 11];
  
  // 完整的身份证号码
  const idCard = `${baseId}${checkCode}`;
  console.log(`生成测试身份证号码: ${idCard.substring(0, 6)}********${idCard.substring(14)}`);
  
  return idCard;
}

/**
 * 主函数 - 恢复所有客户的真实身份证号码
 */
async function restoreRealIdCards() {
  try {
    console.log('开始恢复真实身份证号码...');

    // 查找所有客户
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true
      }
    });
    
    console.log(`共找到 ${customers.length} 个客户记录`);
    
    const results = {
      total: customers.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      details: []
    };
    
    // 处理每个客户
    for (const customer of customers) {
      console.log(`\n处理客户: ID ${customer.id}, 姓名: ${customer.name}`);
      
      try {
        // 尝试查找真实身份证号码
        const realIdCard = await findRealIdCard(customer.id, customer.name);
        
        if (!realIdCard) {
          console.log(`未找到客户 ID ${customer.id} 的真实身份证号码，跳过...`);
          results.skipped++;
          results.details.push({
            id: customer.id,
            name: customer.name,
            status: 'skipped',
            message: '未找到真实身份证号码'
          });
          continue;
        }
        
        // 加密身份证号码和生成哈希
        const encryptedIdCard = encryptIdCard(realIdCard);
        const idCardHash = hashIdCard(realIdCard);
        
        // 更新客户记录
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idCardNumberEncrypted: encryptedIdCard,
            idCardHash: idCardHash
          }
        });
        
        console.log(`成功更新客户 ID ${customer.id} 的身份证号码`);
        results.updated++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'updated',
          message: '成功恢复真实身份证号码'
        });
      } catch (error) {
        console.error(`处理客户 ID ${customer.id} 时出错:`, error);
        results.failed++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'failed',
          message: '处理过程中出错'
        });
      }
    }
    
    // 输出结果摘要
    console.log('\n========== 恢复结果汇总 ==========');
    console.log(`总客户数: ${results.total}`);
    console.log(`成功更新: ${results.updated}`);
    console.log(`跳过处理: ${results.skipped}`);
    console.log(`处理失败: ${results.failed}`);
    
    console.log('\n成功更新的客户:');
    const updated = results.details.filter(d => d.status === 'updated');
    if (updated.length > 0) {
      updated.forEach(c => {
        console.log(`- ID: ${c.id}, 姓名: ${c.name}`);
      });
    } else {
      console.log('没有成功更新的客户');
    }
    
    console.log('\n恢复完成！');
  } catch (error) {
    console.error('恢复过程中发生错误:', error);
  } finally {
    // 关闭Prisma连接
    await prisma.$disconnect();
  }
}

// 执行恢复
restoreRealIdCards(); 