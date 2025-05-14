/**
 * 加密密钥生成脚本
 * 用于生成一个强力的64位加密密钥，并提供将其设置到.env文件的功能
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 生成一个强力的随机密钥（64位 = 32字节 = 256位）
function generateEncryptionKey() {
  // 生成32字节（256位）的随机数据
  const keyBuffer = crypto.randomBytes(32);
  
  // 转换为Base64格式，用于存储
  const base64Key = keyBuffer.toString('base64');
  
  // 还可以提供hex格式作为参考
  const hexKey = keyBuffer.toString('hex');
  
  return {
    buffer: keyBuffer,
    base64: base64Key,
    hex: hexKey
  };
}

// 更新.env文件中的加密密钥
function updateEnvFile(keyBase64) {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = '';
    
    // 检查.env文件是否存在
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // 如果已存在ENCRYPTION_KEY，替换它
      if (envContent.includes('ENCRYPTION_KEY=')) {
        envContent = envContent.replace(/ENCRYPTION_KEY=.*(\r?\n|$)/g, `ENCRYPTION_KEY=${keyBase64}$1`);
      } else {
        // 如果不存在，添加它
        envContent += `\nENCRYPTION_KEY=${keyBase64}\n`;
      }
    } else {
      // 如果.env文件不存在，创建它
      envContent = `ENCRYPTION_KEY=${keyBase64}\n`;
    }
    
    // 写入.env文件
    fs.writeFileSync(envPath, envContent);
    
    console.log('.env文件已更新，ENCRYPTION_KEY已设置');
    return true;
  } catch (error) {
    console.error('更新.env文件失败:', error);
    return false;
  }
}

// 生成密钥
const key = generateEncryptionKey();

// 输出密钥信息
console.log('生成的加密密钥信息：');
console.log('Base64格式（推荐使用）：', key.base64);
console.log('Hex格式（参考）：', key.hex);
console.log('密钥长度：', key.buffer.length, '字节');

// 提示用户
console.log('\n请将Base64格式的密钥添加到环境变量中：');
console.log('ENCRYPTION_KEY=' + key.base64);
