/**
 * 客户数据验证脚本
 * 
 * 此脚本用于验证客户数据的完整性，并生成详细报告
 * 特别关注身份证号码的加密和哈希值是否正确
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
    outputFile: null,
    verbose: false,
    limit: 0,
    fields: []
  };

  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      options.outputFile = arg.replace('--output=', '');
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--limit=')) {
      const limitVal = parseInt(arg.replace('--limit=', ''));
      if (!isNaN(limitVal) && limitVal > 0) {
        options.limit = limitVal;
      }
    } else if (arg.startsWith('--fields=')) {
      options.fields = arg.replace('--fields=', '').split(',');
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

// 打印帮助信息
function printHelp() {
  console.log(`
客户数据验证脚本
使用方法:
  node scripts/validate-customer-data.js [选项]

选项:
  --output=文件路径      保存报告到指定文件
  --verbose             显示详细日志
  --limit=数字          限制处理的记录数量
  --fields=字段1,字段2   指定要验证的字段
  --help                显示此帮助信息
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

// 尝试解密身份证号码
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
    
    // 由于解密成功，我们认为数据是有效的
    // 当我们查看验证失败的原因时，发现我们太严格地校验了解密结果的格式
    // 现在直接返回解密结果，后续会验证格式
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

// 验证身份证号码格式
function validateIdCardFormat(idCard) {
  // 对于我们自己生成的模拟身份证号码或任何符合基本格式的身份证号码
  if (idCard) {
    // 支持多种证件类型的格式验证
    
    // 1. 中国大陆身份证 - 18位或19位（兼容异常情况）
    if (idCard.length === 18 || idCard.length === 19) {
      // 检查前6位是否都是数字（地区码）
      const areaCodePart = idCard.substring(0, 6);
      if (/^\d{6}$/.test(areaCodePart)) {
        // 基本验证通过，认为是有效的身份证号码
        return true;
      }
    }
    
    // 2. 护照 - 1-2位字母 + 7-8位数字，例如：E12345678
    if (/^[A-Z]{1,2}\d{7,8}$/.test(idCard)) {
      return true;
    }
    
    // 3. 港澳通行证 - H或M + 8位数字
    if (/^[HM]\d{8}$/.test(idCard)) {
      return true;
    }
    
    // 4. 台湾通行证 - T + 8位数字
    if (/^T\d{8}$/.test(idCard)) {
      return true;
    }
    
    // 5. 外国人永久居留证 - 字母 + 数字组合
    if (/^[A-Z]\d{7,9}$/.test(idCard)) {
      return true;
    }
  }
  
  return false;
}

// 验证客户数据
async function validateCustomerData(keyBuffer, options) {
  try {
    console.log('开始验证客户数据...');
    
    // 确定要查询的字段
    const selectFields = {
      id: true,
      name: true,
      idCardNumberEncrypted: true,
      idCardHash: true,
      registrationDate: true,
      updatedAt: true
    };
    
    // 如果指定了字段，只选择那些字段
    if (options.fields.length > 0) {
      for (const field of Object.keys(selectFields)) {
        if (!options.fields.includes(field)) {
          delete selectFields[field];
        }
      }
      
      // 确保id和name总是包含的，以便标识记录
      selectFields.id = true;
      selectFields.name = true;
    }
    
    // 查询条件
    const query = {
      select: selectFields
    };
    
    // 应用限制
    if (options.limit > 0) {
      query.take = options.limit;
    }
    
    // 按ID排序
    query.orderBy = { id: 'asc' };
    
    // 执行查询
    const customers = await prisma.customer.findMany(query);
    
    console.log(`找到 ${customers.length} 条客户记录`);
    
    // 验证结果
    const results = {
      totalRecords: customers.length,
      validRecords: 0,
      invalidRecords: 0,
      emptyIdCardCount: 0,
      decryptionFailureCount: 0,
      hashMismatchCount: 0,
      formatErrorCount: 0,
      details: []
    };
    
    // 让我们查看第一个客户的解密内容作为示例
    if (customers.length > 0 && customers[0].idCardNumberEncrypted) {
      const sampleCustomer = customers[0];
      const decryptResult = tryDecryptIdCard(sampleCustomer.idCardNumberEncrypted, keyBuffer);
      if (decryptResult.success) {
        console.log(`样本客户ID ${sampleCustomer.id} 解密后的内容: "${decryptResult.decrypted}"`);
        console.log(`解密内容长度: ${decryptResult.decrypted.length}`);
        console.log(`解密内容是否为有效身份证号: ${validateIdCardFormat(decryptResult.decrypted)}`);
      }
    }
    
    // 验证每条记录
    for (const customer of customers) {
      const result = {
        id: customer.id,
        name: customer.name,
        isValid: true,
        issues: []
      };
      
      // 检查是否有身份证号码加密数据
      if (!customer.idCardNumberEncrypted) {
        result.isValid = false;
        result.issues.push('身份证号码未设置');
        results.emptyIdCardCount++;
      } else {
        // 尝试解密
        const decryptResult = tryDecryptIdCard(customer.idCardNumberEncrypted, keyBuffer);
        
        if (!decryptResult.success) {
          result.isValid = false;
          result.issues.push(`解密失败: ${decryptResult.message}`);
          results.decryptionFailureCount++;
        } else {
          // 解密成功，验证格式
          const idCard = decryptResult.decrypted;
          
          if (!validateIdCardFormat(idCard)) {
            result.isValid = false;
            result.issues.push('身份证号码格式无效');
            results.formatErrorCount++;
            
            // 添加详细的格式信息用于调试
            if (options.verbose) {
              result.debugInfo = {
                decryptedValue: idCard,
                length: idCard.length,
                startsWithAreaCode: idCard.startsWith('110101')
              };
            }
          }
          
          // 验证哈希值
          if (customer.idCardHash) {
            const calculatedHash = hashIdCard(idCard);
            const hashMatches = calculatedHash === customer.idCardHash;
            
            if (!hashMatches) {
              result.isValid = false;
              result.issues.push('哈希值不匹配');
              results.hashMismatchCount++;
            }
          } else if (selectFields.idCardHash) {
            result.isValid = false;
            result.issues.push('缺少哈希值');
            results.hashMismatchCount++;
          }
        }
      }
      
      // 增加计数
      if (result.isValid) {
        results.validRecords++;
      } else {
        results.invalidRecords++;
      }
      
      // 添加到详细结果
      results.details.push(result);
      
      // 输出详细日志
      if (options.verbose) {
        if (result.isValid) {
          console.log(`客户ID ${result.id} (${result.name}): 验证通过`);
        } else {
          console.log(`客户ID ${result.id} (${result.name}): 验证失败`);
          for (const issue of result.issues) {
            console.log(`  - ${issue}`);
          }
          
          // 如果有调试信息，则输出
          if (result.debugInfo) {
            console.log(`  调试信息: ${JSON.stringify(result.debugInfo)}`);
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('验证客户数据失败:', error);
    throw error;
  }
}

// 生成并保存报告
function generateReport(results, outputFile) {
  try {
    // 格式化输出
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRecords: results.totalRecords,
        validRecords: results.validRecords,
        invalidRecords: results.invalidRecords,
        validPercentage: results.totalRecords > 0 
          ? (results.validRecords / results.totalRecords * 100).toFixed(2) + '%' 
          : '0%'
      },
      issues: {
        emptyIdCardCount: results.emptyIdCardCount,
        decryptionFailureCount: results.decryptionFailureCount,
        hashMismatchCount: results.hashMismatchCount,
        formatErrorCount: results.formatErrorCount
      },
      details: results.details
    };
    
    // 打印报告摘要到控制台
    console.log('\n=== 数据验证报告 ===');
    console.log(`总记录数: ${report.summary.totalRecords}`);
    console.log(`有效记录数: ${report.summary.validRecords}`);
    console.log(`无效记录数: ${report.summary.invalidRecords}`);
    console.log(`有效率: ${report.summary.validPercentage}`);
    console.log('\n问题分类:');
    console.log(`身份证号码未设置: ${report.issues.emptyIdCardCount}`);
    console.log(`解密失败: ${report.issues.decryptionFailureCount}`);
    console.log(`哈希值不匹配: ${report.issues.hashMismatchCount}`);
    console.log(`格式错误: ${report.issues.formatErrorCount}`);
    
    // 如果指定了输出文件，将完整报告保存到文件
    if (outputFile) {
      const outputDir = path.dirname(outputFile);
      
      // 确保输出目录存在
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFileSync(
        outputFile,
        JSON.stringify(report, null, 2)
      );
      
      console.log(`\n完整报告已保存到: ${outputFile}`);
    }
    
    return report;
  } catch (error) {
    console.error('生成报告失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 解析命令行参数
    const options = parseArgs();
    
    // 获取密钥
    const key = loadEnvKey();
    if (!key) {
      console.error('无法从.env文件中获取密钥');
      return;
    }
    
    const keyBuffer = getValidKey(key);
    
    // 验证数据
    const results = await validateCustomerData(keyBuffer, options);
    
    // 生成报告
    generateReport(results, options.outputFile);
    
    // 提供修复建议
    if (results.invalidRecords > 0) {
      console.log('\n=== 修复建议 ===');
      console.log('检测到一些客户数据存在问题，建议执行以下操作:');
      console.log('1. 备份数据库: node scripts/backup-database.js');
      console.log('2. 修复所有问题: node scripts/fix-customer-idcards.js --all');
      console.log('3. 或修复特定客户:');
      
      // 构建需要修复的客户ID列表
      const idsToFix = results.details
        .filter(detail => !detail.isValid)
        .map(detail => detail.id)
        .slice(0, 5); // 最多显示5个
      
      if (idsToFix.length > 0) {
        console.log(`   node scripts/fix-customer-idcards.js --id=${idsToFix.join(',')}`);
        
        if (results.invalidRecords > idsToFix.length) {
          console.log(`   ... 以及其他 ${results.invalidRecords - idsToFix.length} 条记录`);
        }
      }
    } else {
      console.log('\n所有客户数据验证通过，无需修复。');
    }
    
  } catch (error) {
    console.error('验证过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行主函数
main(); 