import crypto from 'crypto';

// 加密密钥和初始化向量（在生产环境中应该从环境变量获取）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here';
const IV_LENGTH = 16;

// 加密身份证号码
export function encryptIdCard(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 解密身份证号码
export function decryptIdCard(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() || '', 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// 生成身份证号码的哈希值（用于查重）
export function hashIdCard(text: string): string {
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex');
}

// 验证身份证号码格式
export function validateIdCard(idCard: string): boolean {
  const pattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/;
  return pattern.test(idCard);
} 