/**
 * 简单的Base64解码脚本
 */

// Base64字符串
const base64String = "VMJVYX9ZFHX9RJA7+ZXLRBIC+RLJ0QNFWT42FV0K/MVZS6C6IUE/QB3Z6GNSJQ==";

// 尝试直接解码Base64
try {
  console.log('尝试解码Base64字符串...');
  console.log('输入字符串：', base64String);
  
  // 解码为Buffer
  const buffer = Buffer.from(base64String, 'base64');
  
  // 尝试以各种编码格式输出
  console.log('\n以不同编码格式解码结果:');
  console.log('UTF-8:', buffer.toString('utf8'));
  console.log('ASCII:', buffer.toString('ascii'));
  console.log('Hex:', buffer.toString('hex'));
  console.log('二进制长度:', buffer.length, '字节');
  
  // 输出前10个字节的二进制值
  let bytesStr = '';
  for (let i = 0; i < Math.min(buffer.length, 16); i++) {
    bytesStr += buffer[i].toString(16).padStart(2, '0') + ' ';
  }
  console.log('前16个字节(Hex):', bytesStr);
  
} catch (error) {
  console.error('解码过程出错:', error);
} 