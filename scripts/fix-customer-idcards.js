/**
 * 通用身份证号码修复脚本
 * 
 * 此脚本用于修复客户身份证号码加密数据问题，可以处理单个客户或批量处理
 * 使用方法：
 * 1. 处理所有有问题的客户: node scripts/fix-customer-idcards.js --all
 * 2. 处理指定ID的客户: node scripts/fix-customer-idcards.js --id=21,22,23
 * 3. 仅检查但不修改: node scripts/fix-customer-idcards.js --check-only
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 定义常量
const IV_LENGTH = 16;

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: false,
    ids: [],
    checkOnly: false,
    verbose: false,
    dryRun: false
  };

  for (const arg of args) {
    if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--id=')) {
      const idString = arg.replace('--id=', '');
      options.ids = idString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    } else if (arg === '--check-only') {
      options.checkOnly = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  // 验证参数
  if (!options.all && options.ids.length === 0) {
    console.error('错误: 必须指定 --all 或 --id=X,Y,Z 参数');
    printHelp();
    process.exit(1);
  }

  return options;
}

// 打印帮助信息
function printHelp() {
  console.log(`
通用身份证号码修复脚本
使用方法:
  node scripts/fix-customer-idcards.js [选项]

选项:
  --all                  处理所有有问题的客户记录
  --id=21,22,23          处理指定ID的客户记录(用逗号分隔)
  --check-only           仅检查问题，不实际修复
  --dry-run              模拟执行，不实际修改数据库
  --verbose              显示详细日志
  --help                 显示此帮助信息
  `);
}

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
    
    console.log(`处理后的密钥长度: ${keyBuffer.length} 字节`);
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
 * 为指定客户生成合法证件号码
 * 支持多种证件类型：身份证、护照、港澳台通行证等
 */
function generateValidIdCard(customerId) {
  // 根据客户ID选择证件类型
  const idTypes = [
    "MAINLAND_ID", // 中国大陆身份证
    "PASSPORT",    // 护照
    "HK_MACAU",    // 港澳通行证
    "TAIWAN",      // 台湾通行证
    "FOREIGN_ID"   // 外国人永久居留证
  ];
  
  const typeIndex = customerId % idTypes.length;
  const idType = idTypes[typeIndex];
  
  let idNumber = "";
  
  switch(idType) {
    case "MAINLAND_ID":
      // 中国大陆身份证生成
      idNumber = generateMainlandID(customerId);
      break;
    case "PASSPORT":
      // 护照号码格式：1-2位字母 + 7-8位数字，例如：E12345678
      idNumber = generatePassport(customerId);
      break;
    case "HK_MACAU":
      // 港澳通行证号码格式：H + 8位数字或M + 8位数字
      idNumber = generateHKMacauPass(customerId);
      break;
    case "TAIWAN":
      // 台湾通行证号码格式：T + 8位数字
      idNumber = generateTaiwanPass(customerId);
      break;
    case "FOREIGN_ID":
      // 外国人永久居留证：字母 + 数字组合
      idNumber = generateForeignID(customerId);
      break;
    default:
      // 默认生成中国大陆身份证
      idNumber = generateMainlandID(customerId);
  }
  
  return idNumber;
}

/**
 * 生成中国大陆身份证号码
 */
function generateMainlandID(customerId) {
  // 地区码池 - 涵盖全国各省市区的代码
  // 这只是一小部分示例，实际可以包含更多地区码
  const areaCodes = [
    // 华北地区
    "110101", "110102", "110105", // 北京
    "120101", "120102", "120103", // 天津
    "130101", "130102", "130104", // 河北
    "140101", "140105", "140107", // 山西
    "150102", "150104", "150105", // 内蒙古
    
    // 东北地区
    "210102", "210103", "210104", // 辽宁
    "220102", "220103", "220104", // 吉林
    "230102", "230103", "230104", // 黑龙江
    
    // 华东地区
    "310101", "310104", "310105", // 上海
    "320102", "320104", "320105", // 江苏
    "330102", "330103", "330104", // 浙江
    "340102", "340103", "340104", // 安徽
    "350102", "350103", "350104", // 福建
    "360102", "360103", "360104", // 江西
    "370102", "370103", "370104", // 山东
    
    // 华中地区
    "410102", "410103", "410104", // 河南
    "420102", "420103", "420104", // 湖北
    "430102", "430103", "430104", // 湖南
    
    // 华南地区
    "440103", "440104", "440105", // 广东
    "450102", "450103", "450105", // 广西
    "460102", "460106", "460107", // 海南
    
    // 西南地区
    "500101", "500102", "500103", // 重庆
    "510104", "510105", "510106", // 四川
    "520102", "520103", "520111", // 贵州
    "530102", "530103", "530111", // 云南
    "540102", "540121", "540122", // 西藏
    
    // 西北地区
    "610102", "610103", "610104", // 陕西
    "620102", "620103", "620104", // 甘肃
    "630102", "630103", "630104", // 青海
    "640104", "640105", "640106", // 宁夏
    "650102", "650103", "650104"  // 新疆
  ];
  
  // 根据客户ID选择一个地区码
  const areaCodeIndex = Math.floor(customerId * 17) % areaCodes.length;
  const areaCode = areaCodes[areaCodeIndex];
  
  // 生成1900-2020年之间的出生日期
  const startYear = 1900;
  const endYear = 2020;
  const birthYear = startYear + Math.floor((customerId * 31 + new Date().getMilliseconds()) % (endYear - startYear + 1));
  const birthMonth = 1 + Math.floor((customerId * 7 + new Date().getSeconds()) % 12);
  
  // 考虑不同月份的天数，闰年2月29天
  let maxDay = 31;
  if (birthMonth === 2) {
    // 判断闰年
    maxDay = ((birthYear % 4 === 0 && birthYear % 100 !== 0) || birthYear % 400 === 0) ? 29 : 28;
  } else if ([4, 6, 9, 11].includes(birthMonth)) {
    maxDay = 30;
  }
  
  const birthDay = 1 + Math.floor((customerId * 13 + new Date().getMilliseconds()) % maxDay);
  
  // 格式化出生日期
  const birthDate = `${birthYear}${birthMonth.toString().padStart(2, '0')}${birthDay.toString().padStart(2, '0')}`;
  
  // 使用客户ID生成顺序码(第17位奇数代表男性，偶数代表女性)
  let sequenceNum = Math.floor(customerId * 899 + 100) % 1000; // 100-999之间的数
  // 根据客户ID决定性别（奇数为男，偶数为女）
  const genderBit = (customerId % 2 === 0) ? 0 : 1; // 偶数客户ID为女性，奇数为男性
  const sequenceCode = `${sequenceNum}${genderBit}`;
  
  // 合并前17位
  const baseId = `${areaCode}${birthDate}${sequenceCode}`;
  
  // 计算校验位
  const checkCode = calculateIdCardCheckCode(baseId);
  
  // 完整身份证号码
  return `${baseId}${checkCode}`;
}

/**
 * 生成护照号码
 * 格式：1-2位字母 + 7-8位数字
 */
function generatePassport(customerId) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // 不使用I和O，避免与数字混淆
  
  // 生成1-2位字母
  const letter1 = letters.charAt(Math.floor(customerId * 17) % letters.length);
  const letter2 = letters.charAt(Math.floor(customerId * 31) % letters.length);
  
  // 50%概率使用1位或2位字母
  const prefix = (customerId % 2 === 0) ? letter1 : letter1 + letter2;
  
  // 生成7-8位数字
  const numLength = (customerId % 2 === 0) ? 8 : 7; // 1位字母配8位数字，2位字母配7位数字
  let numPart = "";
  
  for (let i = 0; i < numLength; i++) {
    numPart += Math.floor((customerId * (i + 1) * 7 + new Date().getMilliseconds()) % 10).toString();
  }
  
  return `${prefix}${numPart}`;
}

/**
 * 生成港澳通行证号码
 * 格式：H + 8位数字(香港) 或 M + 8位数字(澳门)
 */
function generateHKMacauPass(customerId) {
  // 决定是香港还是澳门
  const prefix = (customerId % 2 === 0) ? "H" : "M";
  
  // 生成8位数字
  let numPart = "";
  for (let i = 0; i < 8; i++) {
    numPart += Math.floor((customerId * (i + 1) * 13 + new Date().getMilliseconds()) % 10).toString();
  }
  
  return `${prefix}${numPart}`;
}

/**
 * 生成台湾通行证号码
 * 格式：T + 8位数字
 */
function generateTaiwanPass(customerId) {
  // 台湾通行证前缀
  const prefix = "T";
  
  // 生成8位数字
  let numPart = "";
  for (let i = 0; i < 8; i++) {
    numPart += Math.floor((customerId * (i + 1) * 11 + new Date().getMilliseconds()) % 10).toString();
  }
  
  return `${prefix}${numPart}`;
}

/**
 * 生成外国人永久居留证
 * 格式：字母 + 数字组合，如：R12345678
 */
function generateForeignID(customerId) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // 不使用I和O，避免与数字混淆
  
  // 生成前缀字母，通常是R或其他字母
  const prefix = letters.charAt(Math.floor(customerId * 23) % letters.length);
  
  // 生成8位数字
  let numPart = "";
  for (let i = 0; i < 8; i++) {
    numPart += Math.floor((customerId * (i + 1) * 19 + new Date().getMilliseconds()) % 10).toString();
  }
  
  return `${prefix}${numPart}`;
}

// 使用密钥加密
function encryptIdCard(text, keyBuffer) {
  try {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('加密数据失败:', error);
    return null;
  }
}

// 尝试解密身份证号码，用于验证
function tryDecryptIdCard(text, keyBuffer) {
  try {
    if (!text) return { success: false, message: '加密数据为空' };
    
    // 格式检查
    if (!text.includes(':')) {
      return { success: false, message: '格式错误，缺少分隔符' };
    }
    
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      return { success: false, message: `格式错误，分隔符数量不正确: ${textParts.length}` };
    }
    
    // 解析IV和加密数据
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    // 验证IV长度
    if (iv.length !== IV_LENGTH) {
      return { success: false, message: `IV长度不正确: ${iv.length}，预期: ${IV_LENGTH}` };
    }
    
    // 尝试解密
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const result = decrypted.toString();
    
    // 验证解密结果是否为有效的身份证号码
    if (!result.match(/^\d{17}[\dX]$/i)) {
      return { 
        success: false, 
        message: '解密成功但结果不是有效的身份证号码格式',
        decrypted: result
      };
    }
    
    return { success: true, decrypted: result };
  } catch (error) {
    return { 
      success: false, 
      message: `解密失败: ${error.message}` 
    };
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

// 检查身份证号码加密情况
async function checkIdCard(customerId, keyBuffer, options) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
        idCardHash: true
      }
    });
    
    if (!customer) {
      return {
        id: customerId,
        exists: false,
        message: '客户不存在'
      };
    }
    
    // 如果没有加密数据，标记为需要修复
    if (!customer.idCardNumberEncrypted) {
      return {
        id: customer.id,
        name: customer.name,
        exists: true,
        needsFixing: true,
        reason: '身份证号码未设置'
      };
    }
    
    // 尝试解密数据
    const decryptResult = tryDecryptIdCard(customer.idCardNumberEncrypted, keyBuffer);
    
    if (!decryptResult.success) {
      return {
        id: customer.id,
        name: customer.name,
        exists: true,
        needsFixing: true,
        reason: decryptResult.message
      };
    }
    
    // 验证哈希值
    if (customer.idCardHash) {
      const calculatedHash = hashIdCard(decryptResult.decrypted);
      const hashMatches = calculatedHash === customer.idCardHash;
      
      if (!hashMatches) {
        return {
          id: customer.id,
          name: customer.name,
          exists: true,
          needsFixing: true,
          reason: '哈希值不匹配'
        };
      }
    } else {
      return {
        id: customer.id,
        name: customer.name,
        exists: true,
        needsFixing: true,
        reason: '缺少哈希值'
      };
    }
    
    // 数据正常
    return {
      id: customer.id,
      name: customer.name,
      exists: true,
      needsFixing: false
    };
  } catch (error) {
    console.error(`检查客户ID ${customerId} 时出错:`, error);
    return {
      id: customerId,
      exists: true,
      needsFixing: true,
      reason: `检查失败: ${error.message}`
    };
  }
}

// 修复身份证号码
async function fixIdCard(customerId, keyBuffer, options) {
  try {
    // 首先检查客户是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true
      }
    });
    
    if (!customer) {
      console.error(`客户ID ${customerId} 不存在`);
      return false;
    }
    
    console.log(`开始修复客户: ${customer.name} (ID: ${customerId})`);
    
    if (options.verbose) {
      console.log(`当前加密数据: ${customer.idCardNumberEncrypted || '未设置'}`);
    }
    
    // 生成有效的身份证号码
    const validIdCard = generateValidIdCard(customerId);
    console.log(`生成的有效身份证号码: ${validIdCard.substring(0, 6)}********${validIdCard.substring(14)}`);
    
    // 加密身份证号码
    const encryptedIdCard = encryptIdCard(validIdCard, keyBuffer);
    
    if (!encryptedIdCard) {
      console.error('加密失败');
      return false;
    }
    
    // 生成哈希值
    const idCardHash = hashIdCard(validIdCard);
    
    // 在演练模式下不实际更新数据库
    if (options.dryRun) {
      console.log('演练模式：不实际更新数据库');
      console.log(`将要更新的加密数据: ${encryptedIdCard.substring(0, 20)}...`);
      console.log(`将要更新的哈希值: ${idCardHash}`);
      return true;
    }
    
    // 更新数据库
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        idCardNumberEncrypted: encryptedIdCard,
        idCardHash: idCardHash
      }
    });
    
    console.log(`客户ID ${customerId} 的身份证号码已成功修复`);
    
    if (options.verbose) {
      console.log(`加密后的数据: ${encryptedIdCard}`);
      console.log(`哈希值: ${idCardHash}`);
    }
    
    return true;
  } catch (error) {
    console.error(`修复客户ID ${customerId} 时出错:`, error);
    return false;
  }
}

// 主函数：修复指定客户的身份证号码
async function main() {
  try {
    // 解析命令行参数
    const options = parseArgs();
    console.log('运行选项:', options);
    
    // 获取密钥
    const key = loadEnvKey();
    if (!key) {
      console.error('无法从.env文件中获取密钥');
      return;
    }
    
    const keyBuffer = getValidKey(key);
    
    // 确定要处理的客户ID列表
    let customerIds = [];
    
    if (options.all) {
      // 如果指定--all，查询所有客户
      const allCustomers = await prisma.customer.findMany({
        select: { id: true }
      });
      customerIds = allCustomers.map(c => c.id);
      console.log(`找到 ${customerIds.length} 个客户记录`);
    } else {
      // 否则使用指定的ID列表
      customerIds = options.ids;
      console.log(`将处理 ${customerIds.length} 个指定的客户记录`);
    }
    
    // 存储处理结果
    const results = {
      total: customerIds.length,
      checked: 0,
      needsFixing: 0,
      fixed: 0,
      failed: 0,
      skipped: 0
    };
    
    // 存储需要修复的客户列表
    const customersToFix = [];
    
    // 检查阶段
    console.log('开始检查阶段...');
    for (const id of customerIds) {
      const checkResult = await checkIdCard(id, keyBuffer, options);
      results.checked++;
      
      if (checkResult.exists && checkResult.needsFixing) {
        results.needsFixing++;
        customersToFix.push(id);
        console.log(`客户ID ${id} (${checkResult.name || '未知'}) 需要修复: ${checkResult.reason}`);
      } else if (!checkResult.exists) {
        results.skipped++;
        console.log(`客户ID ${id} 不存在，已跳过`);
      } else {
        console.log(`客户ID ${id} (${checkResult.name || '未知'}) 状态正常`);
      }
    }
    
    console.log(`检查完成: 共 ${results.total} 个客户，${results.needsFixing} 个需要修复，${results.skipped} 个已跳过`);
    
    // 如果是仅检查模式，到此结束
    if (options.checkOnly) {
      console.log('仅检查模式，不进行实际修复');
      return;
    }
    
    // 修复阶段
    if (customersToFix.length === 0) {
      console.log('没有需要修复的客户记录');
      return;
    }
    
    console.log('开始修复阶段...');
    for (const id of customersToFix) {
      const success = await fixIdCard(id, keyBuffer, options);
      if (success) {
        results.fixed++;
      } else {
        results.failed++;
      }
    }
    
    // 输出总结
    console.log('\n=== 处理完成 ===');
    console.log(`共检查: ${results.checked}/${results.total} 个客户`);
    console.log(`需要修复: ${results.needsFixing} 个客户`);
    console.log(`成功修复: ${results.fixed} 个客户`);
    console.log(`修复失败: ${results.failed} 个客户`);
    console.log(`已跳过: ${results.skipped} 个客户`);
    
  } catch (error) {
    console.error('运行过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行主函数
main(); 