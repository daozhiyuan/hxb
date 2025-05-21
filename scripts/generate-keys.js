const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 生成RSA密钥对
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// 保存私钥
fs.writeFileSync(path.join(process.cwd(), 'private.pem'), privateKey);
console.log('私钥已保存到 private.pem');

// 保存公钥
fs.writeFileSync(path.join(process.cwd(), 'public.pem'), publicKey);
console.log('公钥已保存到 public.pem');

console.log('RSA密钥对生成完成！'); 