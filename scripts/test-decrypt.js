/**
 * 证件号码解密测试工具
 * 
 * 此脚本用于测试解密证件号码的功能，特别是处理双层加密的情况。
 * 用法: node test-decrypt.js <加密字符串>
 */

const crypto = require('crypto');
require('dotenv').config();
const base64js = require('base64-js');

// 加密相关常量
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('错误: 未找到加密密钥！请确保ENCRYPTION_KEY环境变量已设置。');
  process.exit(1);
}

console.log('加密密钥已配置');
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

// 检查是否是Base64格式
function isBase64(text) {
  if (!text) return false;
  
  // 基本Base64格式检查
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  const isBase64Chars = base64Regex.test(text);
  const isBase64Length = text.length % 4 === 0;
  
  // 简单的启发式检查：长度适当（不太短也不太长）且符合Base64特征
  return text.length > 20 && 
         text.length < 200 && 
         isBase64Chars && 
         isBase64Length;
}

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

// 尝试Base64解码
function tryDecodeBase64(text) {
  try {
    if (!isBase64(text)) {
      return { success: false, result: text, message: '不是有效的Base64格式' };
    }
    
    // 标准化Base64字符串，处理填充问题
    let normalizedText = text;
    const paddingNeeded = text.length % 4;
    if (paddingNeeded > 0) {
      normalizedText += '='.repeat(4 - paddingNeeded);
    }
    
    try {
      // 尝试使用Buffer.from解码
      const decoded = Buffer.from(normalizedText, 'base64').toString('utf8');
      
      // 检查解码结果是否有效
      if (!decoded || decoded.length < 5) {
        return { success: false, result: text, message: 'Buffer.from解码结果无效' };
      }
      
      if (decoded.match(/[^\x20-\x7E]/g) && decoded.match(/[^\x20-\x7E]/g).length > decoded.length * 0.3) {
        console.log('Buffer.from方法可能解码不完整，尝试其他方法');
      } else {
        return { success: true, result: decoded, message: 'Buffer.from解码成功' };
      }
    } catch (bufferError) {
      console.log('使用Buffer.from解码失败，尝试其他方法');
    }
    
    // 尝试使用base64-js库解码
    try {
      // 使用base64-js库解码
      const byteArray = base64js.toByteArray(normalizedText);
      const decoded = Buffer.from(byteArray).toString('utf8');
      
      if (!decoded || decoded.length < 5) {
        return { success: false, result: text, message: 'base64-js解码结果无效' };
      }
      
      return { success: true, result: decoded, message: 'base64-js解码成功' };
    } catch (base64jsError) {
      console.log('使用base64-js解码失败');
    }
    
    // 如果所有方法都失败，尝试直接解析
    try {
      // 直接将输入视为字符串，进行进一步处理
      console.log('尝试解析输入作为字符串');
      
      // 检查是否看起来像特定的证件号码格式
      if (/^\d{18}$/.test(text) || /^\d{17}[Xx]$/.test(text)) {
        return { success: true, result: text, message: '输入看起来是身份证格式' };
      }
      
      if (/^[A-Z]{1,2}\d{7,8}$/.test(text)) {
        return { success: true, result: text, message: '输入看起来是护照格式' };
      }
      
      if (/^[A-Z]\d{6}(\([0-9A]\))?$/.test(text)) {
        return { success: true, result: text, message: '输入看起来是香港身份证格式' };
      }
      
      // 如果输入足够短，可能已经是解密后的结果
      if (text.length >= 5 && text.length <= 30) {
        return { success: true, result: text, message: '输入长度适中，可能是有效证件号码' };
      }
    } catch (directError) {
      console.log('直接解析失败');
    }
    
    return { success: false, result: text, message: '所有解码方法都失败' };
  } catch (error) {
    return { success: false, result: text, message: `Base64解码出错: ${error.message}` };
  }
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
    
      const result = decrypted.toString('utf8');
      
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

// 完整的解密流程，模拟产品中的解密逻辑
function fullDecrypt(encryptedText) {
  console.log('执行完整解密流程...');
  
  try {
    if (!encryptedText) {
      console.log('输入为空');
      return '';
    }
    
    // 处理普通证件号码
    // 可能是证件号码格式，尝试匹配
    const idCard18Regex = /^\d{17}[\dXx]$/i;
    const passportRegex = /^[A-Z]{1,2}\d{7,8}$/i;
    const hkIdRegex = /^[A-Z][0-9]{6}(\([0-9A]\))?$/i;
    
    if (idCard18Regex.test(encryptedText) || 
        passportRegex.test(encryptedText) || 
        hkIdRegex.test(encryptedText) ||
        (encryptedText.length >= 5 && encryptedText.length <= 30)) {
      console.log('输入看起来已经是证件号码格式，无需解密');
      return encryptedText;
    }
    
    // 首先检查是否是Base64格式
    if (isBase64(encryptedText)) {
      console.log('检测到Base64格式，尝试解码');
      const base64Result = tryDecodeBase64(encryptedText);
      
      if (base64Result.success) {
        console.log(`Base64解码成功: ${base64Result.message}`);
        console.log(`解码结果长度: ${base64Result.result.length} 字符`);
        
        // 打印解码结果的字节表示
        console.log('解码结果的字节表示:');
        const buffer = Buffer.from(base64Result.result);
        let byteString = '';
        for (let i = 0; i < Math.min(buffer.length, 30); i++) {
          byteString += buffer[i].toString(16).padStart(2, '0') + ' ';
        }
        if (buffer.length > 30) byteString += '...';
        console.log(byteString);
        
        // 检查解码结果是否是加密格式
        if (isValidEncryptedFormat(base64Result.result)) {
          console.log('解码结果是加密格式，继续解密');
          const decryptResult = decryptIdCard(base64Result.result);
          
          if (decryptResult.success) {
            return decryptResult.result;
          } else {
            console.log(`解密失败: ${decryptResult.message}`);
            return base64Result.result;
          }
        } else {
          // 不是加密格式，直接返回解码结果
          return base64Result.result;
        }
      } else {
        console.log(`Base64解码失败: ${base64Result.message}`);
      }
    }
    
    // 如果不是Base64或解码失败，检查是否是标准加密格式
    if (isValidEncryptedFormat(encryptedText)) {
      console.log('检测到标准加密格式，尝试解密');
      const decryptResult = decryptIdCard(encryptedText);
      
      if (decryptResult.success) {
        console.log('第一层解密成功');
        const firstDecrypted = decryptResult.result;
        
        // 检查解密结果是否是Base64格式
        if (isBase64(firstDecrypted)) {
          console.log('检测到Base64格式的解密结果，尝试二次解码');
          const base64Result = tryDecodeBase64(firstDecrypted);
          
          if (base64Result.success) {
            console.log('Base64解码成功，双层加密处理完成');
            return base64Result.result;
          } else {
            console.log(`Base64解码失败: ${base64Result.message}，返回第一层解密结果`);
          }
        }
        
        // 如果不是Base64或解码失败，返回第一层解密结果
        return firstDecrypted;
      } else {
        console.log(`解密失败: ${decryptResult.message}`);
      }
    }
    
    // 所有处理都失败，返回原始输入
    console.log('无法解密，返回原始输入');
    return encryptedText;
  } catch (error) {
    console.error('解密过程出错:', error);
    return '解密出错';
  }
}

// 主函数
function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('用法: node test-decrypt.js <加密字符串>');
    process.exit(1);
  }
  
  const encryptedText = args[0];
  console.log(`输入的加密字符串: ${encryptedText}`);
  
  // 解密并显示结果
  const decryptedText = fullDecrypt(encryptedText);
  console.log(`\n解密结果: ${decryptedText}`);
}

// 执行主函数
main(); 