import { generateRSAKeyPair } from '../lib/encryption';

async function main() {
  try {
    console.log('开始生成 RSA 密钥对...');
    await generateRSAKeyPair();
    console.log('RSA 密钥对生成成功！');
  } catch (error) {
    console.error('生成密钥对失败:', error);
    process.exit(1);
  }
}

main(); 