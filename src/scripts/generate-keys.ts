import { generateRSAKeyPair } from '../lib/encryption';

async function main() {
  try {
    console.log('开始生成 RSA 密钥对...');
    await generateRSAKeyPair();
    console.log('RSA 密钥对生成成功！');
    console.log('密钥文件已保存在 keys 目录下：');
    console.log('- public.pem: RSA 公钥');
    console.log('- private.pem: RSA 私钥');
  } catch (error) {
    console.error('生成密钥对失败:', error);
    process.exit(1);
  }
}

main(); 