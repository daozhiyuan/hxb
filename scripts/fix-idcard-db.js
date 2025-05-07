/**
 * 一劳永逸解决身份证数据问题的脚本
 * 
 * 此脚本直接在数据库级别重置有问题的客户身份证数据
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

// 初始化Prisma客户端 - 使用DATABASE_URL
const prisma = new PrismaClient();

// 加密函数 - 从项目库中复制的核心逻辑
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
 * 主函数 - 直接在数据库中修复指定客户的身份证数据
 */
async function fixIdCardDirectly() {
  try {
    console.log('开始执行数据库级别修复...');

    // 检查客户ID 21是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: 21 },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
      }
    });

    if (!customer) {
      console.log('客户ID 21不存在');
      return;
    }

    console.log(`找到客户: ID ${customer.id}, 姓名: ${customer.name}`);
    console.log(`当前加密数据: ${customer.idCardNumberEncrypted}`);

    // 使用一个临时的有效身份证号码进行重置
    // 这只是一个占位符，管理员需要在界面中输入正确的号码
    const tempIdCard = "000000000000000000"; 

    // 加密临时身份证号码
    const encryptedTemp = encryptIdCard(tempIdCard);
    console.log('加密后的临时数据:', encryptedTemp);
    
    // 验证加密数据格式
    const parts = encryptedTemp.split(':');
    if (parts.length !== 2) {
      console.error('生成的加密数据格式无效，应为 iv:encrypted_text');
      return;
    }
    
    // 确保IV是32个字符的hex字符串
    if (!/^[0-9a-f]{32}$/i.test(parts[0])) {
      console.error('生成的IV格式无效，应为32个hex字符');
      return;
    }
    
    // 确保加密文本是有效的hex字符串
    if (!/^[0-9a-f]+$/i.test(parts[1])) {
      console.error('生成的加密文本格式无效，应为hex字符串');
      return;
    }
    
    console.log('加密数据格式验证通过');
    
    // 更新数据库
    const updatedCustomer = await prisma.customer.update({
      where: { id: 21 },
      data: {
        idCardNumberEncrypted: encryptedTemp,
        idCardHash: null // 设置为null，以便管理员重新设置
      }
    });

    // 验证结果
    const verifiedCustomer = await prisma.customer.findUnique({
      where: { id: 21 },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
        idCardHash: true
      }
    });

    console.log('修复完成！');
    console.log(`客户ID: ${verifiedCustomer.id}, 姓名: ${verifiedCustomer.name}`);
    console.log(`新的加密数据: ${verifiedCustomer.idCardNumberEncrypted}`);
    console.log(`新的哈希值: ${verifiedCustomer.idCardHash}`);
    console.log('请在管理界面中为此客户设置正确的身份证号码');

  } catch (error) {
    console.error('修复过程中发生错误:', error);
  } finally {
    // 关闭Prisma连接
    await prisma.$disconnect();
  }
}

// 执行修复
fixIdCardDirectly(); 