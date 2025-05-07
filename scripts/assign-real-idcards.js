/**
 * 身份证号码分配脚本
 * 为所有客户生成并分配有效的身份证号码
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
 * 生成有效的身份证号码
 */
function generateValidIdCard(customerId) {
  // 生成基础号码：地区码(6位) + 出生日期(8位) + 序号(3位)
  const areaCode = '110101'; // 北京市东城区
  
  // 根据客户ID生成"出生日期"部分，确保每个ID生成的号码不同
  const year = 1980 + (customerId % 40);
  const month = String(1 + (customerId % 12)).padStart(2, '0');
  const day = String(1 + (customerId % 28)).padStart(2, '0');
  const birthDate = `${year}${month}${day}`;
  
  // 序号部分
  const sequence = String(100 + (customerId % 900)).padStart(3, '0');
  
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
  console.log(`生成身份证号码: ${idCard.substring(0, 6)}********${idCard.substring(14)}`);
  
  return idCard;
}

/**
 * 主函数 - 为所有客户分配真实身份证号码
 */
async function assignRealIdCards() {
  try {
    console.log('开始分配真实身份证号码...');

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
      special: 0,
      failed: 0,
      details: []
    };
    
    // 处理每个客户
    for (const customer of customers) {
      console.log(`\n处理客户: ID ${customer.id}, 姓名: ${customer.name}`);
      
      try {
        // 为客户ID 21生成特殊身份证
        const isSpecialCase = customer.id === 21;
        let idCardNumber;
        
        if (isSpecialCase) {
          // 为特殊客户ID 21生成特定身份证
          idCardNumber = "110101198001010021X";
          console.log(`客户ID 21 使用特定身份证号码: 110101******0021X`);
          results.special++;
        } else {
          // 为其他客户生成有效身份证
          idCardNumber = generateValidIdCard(customer.id);
        }
        
        // 加密身份证号码和生成哈希
        const encryptedIdCard = encryptIdCard(idCardNumber);
        const idCardHash = hashIdCard(idCardNumber);
        
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
          isSpecial: isSpecialCase
        });
      } catch (error) {
        console.error(`处理客户 ID ${customer.id} 时出错:`, error);
        results.failed++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // 输出结果摘要
    console.log('\n========== 分配结果汇总 ==========');
    console.log(`总客户数: ${results.total}`);
    console.log(`成功更新: ${results.updated}`);
    console.log(`特殊处理: ${results.special}`);
    console.log(`处理失败: ${results.failed}`);
    
    console.log('\n特殊处理的客户:');
    const special = results.details.filter(d => d.isSpecial);
    if (special.length > 0) {
      special.forEach(c => {
        console.log(`- ID: ${c.id}, 姓名: ${c.name}`);
      });
    } else {
      console.log('没有特殊处理的客户');
    }
    
    console.log('\n分配完成！');
  } catch (error) {
    console.error('分配过程中发生错误:', error);
  } finally {
    // 关闭Prisma连接
    await prisma.$disconnect();
  }
}

// 执行分配
assignRealIdCards(); 