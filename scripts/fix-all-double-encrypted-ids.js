/**
 * 修复所有申诉记录中双层加密或格式异常的证件号码
 * 
 * 此脚本会扫描所有申诉记录，使用增强的解密逻辑检测异常数据，
 * 并尝试将其修复为标准的 `IV:EncryptedHex` 格式。
 * 
 * 前提：请先确保项目已通过 tsc 或类似命令编译，
 *       以便能够加载编译后的 '../dist/lib/decryptIdCard.js' 文件。
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Buffer } = require('buffer');

// 初始化Prisma客户端
const prisma = new PrismaClient();

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

// 检测并尝试修复单个申诉记录
async function checkAndFixAppeal(appeal, autoFix = false, { 
  isValidEncryptedFormat, 
  encryptIdCard, 
  getValidKey, 
  isBase64Format, 
  tryDecodeBase64,
  isValidIdCardFormat,
  IV_LENGTH,
  // 新增，需要直接访问内部解密函数处理 Raw Buffer
  decryptWithKeyAndIv 
}) {
  console.log(`\n检查申诉ID: ${appeal.id}, 客户: ${appeal.customerName}`);
  const originalIdNumber = appeal.idNumber;

  if (!originalIdNumber) {
    console.log('证件号码为空，跳过。');
    return { status: 'skipped', reason: '空值' };
  }

  // 1. 尝试使用核心解密函数解密
  const decryptedResult = decryptIdCardSimple(originalIdNumber);

  // 2. 判断是否需要修复
  let needsFix = false;
  let potentialPlainText = '';
  let reason = '';

  if (decryptedResult.startsWith('[解密失败')) {
    needsFix = true;
    reason = `解密失败 (${decryptedResult})` ;
    // 尝试从原始数据中恢复
    if (isBase64Format(originalIdNumber)) {
      try {
          const rawBuffer = Buffer.from(originalIdNumber, 'base64');
          // 尝试直接解密 Raw Buffer (IV + Data)
          if (rawBuffer.length > IV_LENGTH && decryptWithKeyAndIv) { 
              const iv = rawBuffer.slice(0, IV_LENGTH);
              const encryptedData = rawBuffer.slice(IV_LENGTH);
              const currentKey = getValidKey(process.env.ENCRYPTION_KEY);
              const decryptRawResult = decryptWithKeyAndIv(encryptedData, currentKey, iv);
              if (decryptRawResult.success) {
                  potentialPlainText = decryptRawResult.result;
                  reason += ', 通过 Raw Buffer 解密成功';
              } else {
                  // 如果Raw Buffer解密失败，再尝试解码Base64看是不是标准格式
                  const decoded = tryDecodeBase64(originalIdNumber);
                  if (decoded.success) {
                    if (isValidIdCardFormat(decoded.result)) {
                       potentialPlainText = decoded.result;
                       reason += ', 但Base64解码后看似有效证件号';
                    } else if (isValidEncryptedFormat(decoded.result)){
                        const secondTry = decryptIdCardSimple(decoded.result);
                        if (!secondTry.startsWith('[解密失败')) {
                            potentialPlainText = secondTry;
                            reason += ', Base64解码后再次解密成功';
                        }
                    }
                  }
              }
          } else { 
               reason += ', Base64数据长度不足或解密函数缺失';
          }
      } catch (rawError) {
           reason += ', 处理Base64时出错';
      }
    }
      
  } else if (isValidIdCardFormat(decryptedResult)) {
    // 解密成功且结果是有效证件号码格式
    if (!isValidEncryptedFormat(originalIdNumber)) {
      needsFix = true;
      potentialPlainText = decryptedResult;
      reason = '原始数据非标准加密格式，但解密成功';
      console.log(`原因: ${reason}`);
      console.log(`原始: ${originalIdNumber}`);
      console.log(`解密后: ${potentialPlainText}`);
    } else {
      console.log('数据正常，无需修复。');
      return { status: 'ok' };
    }
  } else {
    // 解密成功，但结果不是有效证件号码格式
    needsFix = true;
    reason = '解密结果非有效证件号格式';
    potentialPlainText = decryptedResult;
    console.log(`原因: ${reason}`);
    console.log(`原始: ${originalIdNumber}`);
    console.log(`解密后: ${potentialPlainText}`);
  }

  // 3. 执行修复
  if (needsFix) {
    if (!potentialPlainText) {
      console.log(`警告: 无法自动修复 ID ${appeal.id} (${reason})，因为无法提取明文。请手动检查: ${originalIdNumber}`);
      return { status: 'failed', reason: `