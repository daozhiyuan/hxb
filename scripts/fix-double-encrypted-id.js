/**
 * 修复双层加密的证件号码问题
 * 
 * 此脚本用于处理证件号码出现双层加密的问题，包括：
 * 1. 先尝试使用当前密钥进行第一层解密
 * 2. 检查是否为Base64格式，若是，则尝试直接使用
 * 3. 提供选项重新使用当前密钥加密并更新数据库
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 初始化Prisma客户端
const prisma = new PrismaClient();

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

// 加密相关常量
const ENCRYPTION_KEY = env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('错误: 未找到加密密钥！请确保ENCRYPTION_KEY环境变量已设置。');
  process.exit(1);
}

console.log('加密密钥长度:', ENCRYPTION_KEY.length);
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

// 解密证件号码
function decryptIdCard(text) {
  try {
    if (!text) return { success: false, result: '', message: '输入为空' };
    
    // 检查格式是否有效
    if (!isValidEncryptedFormat(text)) {
      return {
        success: false,
        result: text,
        message: '数据格式不符合加密标准，可能是未加密数据或格式错误'
      };
    }
    
    // 正常解密流程
    const textParts = text.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    if (iv.length !== IV_LENGTH) {
      return {
        success: false,
        result: text,
        message: `IV长度不正确: ${iv.length}，预期: ${IV_LENGTH}`
      };
    }
    
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      const result = decrypted.toString();
      
      return { 
        success: true,
        result,
        message: '解密成功'
      };
    } catch (error) {
      return {
        success: false,
        result: text,
        message: `解密处理出错: ${error.message}`
      };
    }
  } catch (error) {
    return {
      success: false,
      result: text,
      message: `解密过程出错: ${error.message}`
    };
  }
}

// 加密证件号码
function encryptIdCard(text) {
  try {
    if (!text) return { success: false, result: '', message: '输入为空' };
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const result = iv.toString('hex') + ':' + encrypted.toString('hex');
    
    return {
      success: true,
      result,
      message: '加密成功'
    };
  } catch (error) {
    return {
      success: false,
      result: '',
      message: `加密失败: ${error.message}`
    };
  }
}

// 检查是否是Base64格式
function isBase64(text) {
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(text);
}

// 交互式用户输入
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// 处理特定的加密字符串
async function processEncryptedString(encryptedString, appealId) {
  console.log(`\n处理申诉ID ${appealId} 的加密字符串...`);
  console.log(`加密字符串: ${encryptedString}`);
  
  // 检查加密格式
  const isValid = isValidEncryptedFormat(encryptedString);
  console.log(`加密格式有效: ${isValid}`);
  
  if (!isValid) {
    console.log('此字符串不是有效的加密格式，跳过处理');
    return false;
  }
  
  // 尝试解密
  const decryptResult = decryptIdCard(encryptedString);
  console.log(`第一层解密结果: ${decryptResult.result}`);
  console.log(`解密消息: ${decryptResult.message}`);
  
  if (!decryptResult.success) {
    console.log('解密失败，无法继续处理');
    return false;
  }
  
  // 检查是否是Base64格式，如果是，认为是二重加密
  if (isBase64(decryptResult.result)) {
    console.log('检测到Base64格式结果，疑似二重加密');
    
    // 询问用户是否要重新加密
    const answer = await askQuestion('是否直接使用这个Base64作为证件号码？(y/n) ');
    if (answer.toLowerCase() === 'y') {
      // 直接使用Base64字符串作为证件号码
      return {
        needsUpdate: true,
        idNumber: decryptResult.result
      };
    } else {
      console.log('跳过此记录');
      return false;
    }
  } else {
    console.log('解密结果不是Base64格式，可能是正常加密');
    return false;
  }
}

// 更新数据库中的证件号码
async function updateAppealIdNumber(appealId, idNumber) {
  try {
    console.log(`\n更新申诉ID ${appealId} 的证件号码...`);
    
    // 先重新加密
    const encryptResult = encryptIdCard(idNumber);
    if (!encryptResult.success) {
      console.error(`加密失败: ${encryptResult.message}`);
      return false;
    }
    
    // 更新数据库
    await prisma.appeal.update({
      where: { id: appealId },
      data: { idNumber: encryptResult.result }
    });
    
    console.log(`申诉ID ${appealId} 更新成功！`);
    return true;
  } catch (error) {
    console.error(`更新数据库失败:`, error);
    return false;
  }
}

// 修复特定申诉ID的证件号码
async function fixAppealIdNumber(appealId) {
  try {
    // 查询申诉记录
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      select: {
        id: true,
        customerName: true,
        idNumber: true
      }
    });
    
    if (!appeal) {
      console.log(`未找到申诉ID: ${appealId}`);
      return false;
    }
    
    console.log(`\n找到申诉ID: ${appealId}`);
    console.log(`客户姓名: ${appeal.customerName}`);
    
    // 处理证件号码
    const processResult = await processEncryptedString(appeal.idNumber, appealId);
    
    if (processResult && processResult.needsUpdate) {
      // 更新数据库
      return await updateAppealIdNumber(appealId, processResult.idNumber);
    }
    
    return false;
  } catch (error) {
    console.error(`处理申诉ID ${appealId} 时出错:`, error);
    return false;
  }
}

// 主函数
async function main() {
  try {
    console.log('开始修复双层加密的证件号码问题...');
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const autoFix = args.includes('--auto');
    const test = args.find(arg => arg.startsWith('--test='));
    
    // 测试模式：直接处理一个加密字符串，而不是修复数据库中的记录
    if (test) {
      const encryptedString = test.split('=')[1];
      console.log('测试模式：处理单个加密字符串');
      console.log(`输入: ${encryptedString}`);
      
      // 首先尝试作为标准加密格式处理
      if (isValidEncryptedFormat(encryptedString)) {
        console.log('检测到标准加密格式 (IV:encryptedText)');
        const decryptResult = decryptIdCard(encryptedString);
        
        if (decryptResult.success) {
          console.log(`第一层解密结果: ${decryptResult.result}`);
          
          // 检查是否是Base64格式
          if (isBase64(decryptResult.result)) {
            console.log('解密结果是Base64格式，尝试解码...');
            const decodeResult = tryDecodeBase64(decryptResult.result);
            
            if (decodeResult.success) {
              console.log(`Base64解码结果: ${decodeResult.result}`);
              console.log('处理成功：已完成双层解密');
            } else {
              console.log(`Base64解码失败: ${decodeResult.message}`);
            }
          } else {
            console.log('解密结果不是Base64格式，可能是正常加密');
          }
        } else {
          console.log(`解密失败: ${decryptResult.message}`);
        }
      } 
      // 如果不是标准格式，直接尝试作为Base64处理
      else if (isBase64(encryptedString)) {
        console.log('检测到Base64格式');
        const decodeResult = tryDecodeBase64(encryptedString);
        
        if (decodeResult.success) {
          console.log(`Base64解码结果: ${decodeResult.result}`);
          
          // 检查解码结果是否是加密格式
          if (isValidEncryptedFormat(decodeResult.result)) {
            console.log('Base64解码结果是加密格式，尝试解密...');
            const decryptResult = decryptIdCard(decodeResult.result);
            
            if (decryptResult.success) {
              console.log(`解密结果: ${decryptResult.result}`);
              console.log('处理成功：已完成双层解密');
            } else {
              console.log(`解密失败: ${decryptResult.message}`);
            }
          } else {
            console.log('Base64解码结果不是加密格式');
          }
        } else {
          console.log(`Base64解码失败: ${decodeResult.message}`);
        }
      } else {
        console.log('无法识别输入格式，既不是加密格式也不是Base64格式');
      }
      
      // 直接解密测试
      console.log('\n尝试使用优化后的解密函数处理...');
      const directDecryptResult = directDecrypt(encryptedString);
      console.log(`优化解密结果: ${directDecryptResult}`);
      
      return; // 测试模式结束
    }
    
    // 常规修复模式
    const appealId = parseInt(args[0], 10);
    
    if (isNaN(appealId)) {
      console.error('错误: 申诉ID必须是数字');
      process.exit(1);
    }
    
    // 修复指定的申诉ID
    const success = await fixAppealIdNumber(appealId);
    
    if (success) {
      console.log(`\n✅ 申诉ID ${appealId} 的证件号码已成功修复`);
    } else {
      console.log(`\n❌ 申诉ID ${appealId} 的证件号码修复失败或不需要修复`);
    }
  } catch (error) {
    console.error('执行过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 直接解密函数，模拟产品中使用的解密逻辑
function directDecrypt(encryptedText) {
  try {
    if (!encryptedText) return '';
    
    // 检查是否是标准加密格式
    if (isValidEncryptedFormat(encryptedText)) {
      const decryptResult = decryptIdCard(encryptedText);
      
      if (decryptResult.success) {
        const firstDecrypted = decryptResult.result;
        
        // 检查解密结果是否是Base64格式
        if (isBase64(firstDecrypted)) {
          const decodeResult = tryDecodeBase64(firstDecrypted);
          if (decodeResult.success) {
            return decodeResult.result;
          }
        }
        
        // 如果不是Base64或解码失败，返回第一层解密结果
        return firstDecrypted;
      }
      
      return '解密失败';
    } 
    // 检查是否是Base64格式
    else if (isBase64(encryptedText)) {
      const decodeResult = tryDecodeBase64(encryptedText);
      
      if (decodeResult.success) {
        // 检查解码结果是否是加密格式
        if (isValidEncryptedFormat(decodeResult.result)) {
          const secondDecryptResult = decryptIdCard(decodeResult.result);
          
          if (secondDecryptResult.success) {
            return secondDecryptResult.result;
          }
        }
        
        // 如果不是加密格式或解密失败，返回解码结果
        return decodeResult.result;
      }
    }
    
    // 不是加密格式也不是Base64格式，直接返回原始数据
    return encryptedText;
  } catch (error) {
    return '解密出错';
  }
}

// 执行主函数
main(); 