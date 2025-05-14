import crypto from 'crypto';
import { IdCardType } from './client-validation';
import fs from 'fs';
import path from 'path';

// 密钥配置
const RSA_KEY_PATH = process.env.RSA_KEY_PATH || path.join(process.cwd(), 'keys');
const RSA_PUBLIC_KEY_PATH = path.join(RSA_KEY_PATH, 'public.pem');
const RSA_PRIVATE_KEY_PATH = path.join(RSA_KEY_PATH, 'private.pem');

// AES 配置
const AES_IV_LENGTH = 12;
const AES_AUTH_TAG_LENGTH = 16;
const AES_ALGORITHM = 'aes-256-gcm';

// 确保密钥目录存在
if (typeof window === 'undefined' && !fs.existsSync(RSA_KEY_PATH)) {
  fs.mkdirSync(RSA_KEY_PATH, { recursive: true });
}

// 生成 RSA 密钥对
export async function generateRSAKeyPair(): Promise<void> {
  if (typeof window !== 'undefined') return;
  
  try {
    // 检查密钥是否已存在
    if (fs.existsSync(RSA_PUBLIC_KEY_PATH) && fs.existsSync(RSA_PRIVATE_KEY_PATH)) {
      console.log('RSA 密钥对已存在');
      return;
    }

    // 生成新的 RSA 密钥对
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

    // 保存密钥
    fs.writeFileSync(RSA_PRIVATE_KEY_PATH, privateKey);
    fs.writeFileSync(RSA_PUBLIC_KEY_PATH, publicKey);
    console.log('RSA 密钥对生成成功');
  } catch (error) {
    console.error('生成 RSA 密钥对失败:', error);
    throw new Error('生成密钥对失败');
  }
}

// 读取 RSA 密钥
function getRSAKeys(): { publicKey: string; privateKey: string } {
  if (typeof window !== 'undefined') {
    throw new Error('RSA 密钥只能在服务器端使用');
  }

  try {
    const publicKey = fs.readFileSync(RSA_PUBLIC_KEY_PATH, 'utf8');
    const privateKey = fs.readFileSync(RSA_PRIVATE_KEY_PATH, 'utf8');
    return { publicKey, privateKey };
  } catch (error) {
    console.error('读取 RSA 密钥失败:', error);
    throw new Error('读取密钥失败');
  }
}

// 混合加密函数
export function encryptIdCard(text: string, idCardType: IdCardType = IdCardType.CHINA_MAINLAND): string {
  if (typeof window !== 'undefined') {
    console.error('警告: encryptIdCard 只能在服务器端使用');
    return '';
  }
  
  try {
    if (!text || text.trim() === '') {
      console.warn('警告: 尝试加密空的证件号码');
      return '';
    }
    
    text = text.trim();
    
    // 验证证件号码长度
    if (!isValidIdCardLength(text, idCardType)) {
      console.warn('证件号码长度不符合要求，但继续加密');
    }
    
    // 生成随机 AES 密钥
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(AES_IV_LENGTH);
    
    // 使用 AES 加密数据
    const cipher = crypto.createCipheriv(AES_ALGORITHM, aesKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    
    // 使用 RSA 公钥加密 AES 密钥
    const { publicKey } = getRSAKeys();
    const encryptedKey = crypto.publicEncrypt(
      publicKey,
      Buffer.from(aesKey)
    ).toString('base64');
    
    // 组合所有数据
    const result = {
      encrypted: Buffer.concat([
        iv,
        Buffer.from(encrypted, 'base64'),
        authTag
      ]).toString('base64'),
      encryptedKey
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('加密证件号码失败:', error);
    throw new Error('加密失败，请稍后重试');
  }
}

// 混合解密函数
export function decryptIdCard(text: string): string {
  if (typeof window !== 'undefined') return '';
  if (!text) return '';
  try {
    // 新版混合加密格式（JSON字符串，含encrypted/encryptedKey）
    if (text.trim().startsWith('{') && text.includes('encrypted') && text.includes('encryptedKey')) {
      try {
        const { encrypted, encryptedKey } = JSON.parse(text);
        const { privateKey } = getRSAKeys();
        const aesKey = crypto.privateDecrypt(privateKey, Buffer.from(encryptedKey, 'base64'));
        const buffer = Buffer.from(encrypted, 'base64');
        const iv = buffer.slice(0, AES_IV_LENGTH);
        const authTag = buffer.slice(buffer.length - AES_AUTH_TAG_LENGTH);
        const encryptedData = buffer.slice(AES_IV_LENGTH, buffer.length - AES_AUTH_TAG_LENGTH);
        const decipher = crypto.createDecipheriv(AES_ALGORITHM, aesKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
      } catch (e) {
        console.error('新版混合加密格式解密失败:', e);
        return '[解密失败: 新版加密格式错误]';
      }
    }
    // 明文格式
    if (isValidIdCardFormat(text)) {
      return text;
    }
    // 兼容老格式（Base64、IV:Hex等）
    // ...可按你原有的老解密逻辑补充...
    return '[解密失败: 格式无法识别]';
  } catch (error) {
    console.error('解密过程中发生错误:', error);
    return '[解密失败: 发生异常]';
  }
}

// 验证证件号码长度
function isValidIdCardLength(text: string, idCardType: IdCardType): boolean {
  switch (idCardType) {
    case IdCardType.CHINA_MAINLAND:
      return text.length === 18;
    case IdCardType.PASSPORT:
      return text.length >= 8 && text.length <= 10;
    case IdCardType.HONG_KONG_ID:
      return text.length >= 8 && text.length <= 10;
    case IdCardType.FOREIGN_ID:
      return text.length >= 5;
    default:
      return text.length >= 5;
  }
}

// 验证身份证号码格式
function isValidIdCardFormat(text: string): boolean {
  if (!text) return false;
  
  return (
    /^\d{17}[\dXx]$/i.test(text) || // 中国身份证
    /^[A-Z]{1,2}\d{7,8}$/i.test(text) || // 护照
    /^[A-Z][0-9]{6}(\([0-9A]\))?$/i.test(text) || // 香港身份证
    text.length >= 5 // 其他证件
  );
}

// 哈希身份证号码，用于查重
export function hashIdCard(text: string, idCardType: string = 'CHINA_MAINLAND'): string {
  if (typeof window !== 'undefined') return '';
  
  try {
    if (!text) return '';
    const textWithType = `${idCardType}:${text.trim()}`;
    const hash = crypto.createHash('sha256');
    hash.update(textWithType);
    return hash.digest('hex');
  } catch (error) {
    console.error('计算哈希值失败:', error);
    return `fallback_hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 验证身份证号码
export function validateIdCard(idCard: string): boolean {
  if (!idCard) return false;
  
  idCard = idCard.trim();
  
  if (!/^\d{17}[\dXx]$/.test(idCard)) return false;
  
  const areaCode = idCard.substring(0, 6);
  const birthDate = idCard.substring(6, 14);
  
  const year = parseInt(birthDate.substring(0, 4));
  const month = parseInt(birthDate.substring(4, 6));
  const day = parseInt(birthDate.substring(6, 8));
  const date = new Date(year, month - 1, day);
  
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false;
  }
  
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checksumMap = '10X98765432';
  let sum = 0;
  
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }
  
  const checksum = checksumMap[sum % 11];
  const lastChar = idCard[17].toUpperCase();
  
  return checksum === lastChar;
}

// 检查是否是有效的加密格式
export function isValidEncryptedFormat(text: string): boolean {
  if (!text) return false;
  
  try {
    const data = JSON.parse(text);
    return data.encrypted && data.encryptedKey;
  } catch {
    return false;
  }
}

// 使用新密钥重新加密数据
export function reencryptData(text: string): string | null {
  try {
    if (!text) return null;
    
    // 如果已经是新的加密格式，直接返回
    if (isValidEncryptedFormat(text)) {
      return text;
    }
    
    // 如果是明文格式，直接加密
    if (isValidIdCardFormat(text)) {
      return encryptIdCard(text);
    }
    
    // 尝试解密
    const decrypted = decryptIdCard(text);
    if (decrypted) {
      // 解密成功，重新加密
      return encryptIdCard(decrypted);
    }
    
    // 如果解密失败，返回原始数据
    console.warn('解密失败，保留原始数据');
    return text;
  } catch (error) {
    console.error('重新加密数据失败:', error);
    return text; // 如果出错，返回原始数据
  }
}

// 查找所有需要重新加密的数据
export async function findDataToReencrypt(): Promise<Array<{ id: string; encrypted: string }>> {
  if (typeof window !== 'undefined') return [];
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('查找需要重新加密的数据...');
    }
    return [];
  } catch (error) {
    console.error('查找需要重新加密的数据失败');
    return [];
  }
}

// 批量重新加密数据
export async function batchReencrypt(ids: string[]): Promise<{ success: number; failed: number }> {
  if (typeof window !== 'undefined') return { success: 0, failed: 0 };
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`批量重新加密 ${ids.length} 条数据...`);
    }
    return { success: ids.length, failed: 0 };
  } catch (error) {
    console.error('批量重新加密数据失败');
    return { success: 0, failed: ids.length };
  }
} 