/**
 * 加密密钥生成脚本
 * 用于生成一个强力的64位加密密钥，并提供将其设置到.env文件的功能
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// 主函数
async function main() {
  console.log('加密密钥生成工具');
  console.log('---------------------------------------------');
  
  // 生成新密钥
  const key = generateEncryptionKey();
  
  console.log('\n生成的密钥信息:');
  console.log(`Base64格式: ${key.base64}`);
  console.log(`Hex格式: ${key.hex}`);
  console.log(`长度: ${key.buffer.length} 字节`);
  
  // 创建readline接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // 询问是否更新.env文件
  rl.question('\n是否要更新.env文件中的ENCRYPTION_KEY？(y/n) ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      updateEnvFile(key.base64);
      console.log('\n警告: 如果您已经有加密数据使用旧密钥，更换密钥将导致无法解密这些数据！');
      console.log('请确保备份原始密钥或重新加密所有数据！');
    } else {
      console.log('\n未更新.env文件，如需手动更新，请将以下行添加到.env文件:');
      console.log(`ENCRYPTION_KEY=${key.base64}`);
    }
    
    rl.close();
  });
}

// 执行主函数
main();
