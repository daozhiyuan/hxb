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
  decryptIdCardSimple, 
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
      return { status: 'failed', reason: `无法提取明文 (${reason})` };
    }

    console.log(`检测到问题 (${reason})，准备修复 ID: ${appeal.id}`);
    console.log(`提取到的明文: ${potentialPlainText}`);
    
    const encryptResult = encryptIdCard(potentialPlainText);
    // 确保 encryptIdCard 返回的是标准格式
    if (!encryptResult || !isValidEncryptedFormat(encryptResult)) { 
      console.error(`错误: 重新加密失败或格式无效 for ID ${appeal.id}`);
      return { status: 'failed', reason: '重新加密失败或格式无效' };
    }
    
    const newEncryptedIdNumber = encryptResult;
    console.log(`新加密值: ${newEncryptedIdNumber}`);

    if (newEncryptedIdNumber === originalIdNumber) {
        console.log('新加密值与原始值相同，跳过更新。');
         return { status: 'skipped', reason: '无需更新' };
    }

    if (autoFix) {
      try {
        await prisma.appeal.update({
          where: { id: appeal.id },
          data: { idNumber: newEncryptedIdNumber }
        });
        console.log(`✅ ID ${appeal.id} 自动修复成功！`);
        return { status: 'fixed' };
      } catch (error) {
        console.error(`❌ 自动修复 ID ${appeal.id} 失败:`, error);
        return { status: 'failed', reason: `数据库更新失败: ${error.message}` };
      }
    } else {
      const answer = await askQuestion(`是否使用新加密值更新数据库？(y/n) `);
      if (answer.toLowerCase() === 'y') {
        try {
          await prisma.appeal.update({
            where: { id: appeal.id },
            data: { idNumber: newEncryptedIdNumber }
          });
          console.log(`✅ ID ${appeal.id} 已手动确认修复！`);
          return { status: 'fixed' };
        } catch (error) {
          console.error(`❌ 手动修复 ID ${appeal.id} 失败:`, error);
          return { status: 'failed', reason: `数据库更新失败: ${error.message}` };
        }
      } else {
        console.log(`跳过修复 ID ${appeal.id}`);
        return { status: 'skipped', reason: '用户跳过' };
      }
    }
  }

  return { status: 'ok' };
}

// 主函数
async function main() {
  console.log('开始扫描并修复所有申诉记录中的证件号码...');
  
  let cryptoLib;
  try {
    // 导入编译后的 JS 文件
    // 修复：直接从 dist 目录加载，而不是 dist/lib
    cryptoLib = require('../dist/decryptIdCard.js'); 
     // 检查必要的函数是否存在
     if (!cryptoLib.decryptIdCardSimple || 
         !cryptoLib.isValidEncryptedFormat || 
         !cryptoLib.encryptIdCard ||
         !cryptoLib.getValidKey ||
         !cryptoLib.decryptWithKeyAndIv) { // 确保导入内部函数
          throw new Error('必要的加密/解密函数未在编译后的文件中导出。');
      }
      // 补充可能缺失的常量或函数（如果编译未包含）
      cryptoLib.isBase64Format = cryptoLib.isBase64Format || function(t){ /* 简单实现或报错 */ return false; };
      cryptoLib.tryDecodeBase64 = cryptoLib.tryDecodeBase64 || function(t){ return {success: false, result: t}; };
      cryptoLib.isValidIdCardFormat = cryptoLib.isValidIdCardFormat || function(t){ return false; };
      cryptoLib.IV_LENGTH = cryptoLib.IV_LENGTH || 16;
      
  } catch (error) {
     console.error('\n❌ 错误：无法加载编译后的解密库文件。');
     console.error(`尝试加载路径: ${path.resolve(__dirname, '../dist/decryptIdCard.js')}`);
     console.error('请确保已执行 TypeScript 编译 (例如 tsc 或 npm run build)。');
     console.error('原始错误:', error);
     process.exit(1);
  }

  const args = process.argv.slice(2);
  const autoFix = args.includes('--auto');
  const specificIdArg = args.find(arg => arg.startsWith('--id='));
  const specificId = specificIdArg ? parseInt(specificIdArg.split('=')[1], 10) : null;

  let appeals;
  const prisma = new PrismaClient(); // 在需要时初始化
  try {
      if (specificId && !isNaN(specificId)) {
        console.log(`仅处理申诉ID: ${specificId}`);
        appeals = await prisma.appeal.findMany({ where: { id: specificId } });
      } else {
        console.log('处理所有申诉记录...');
        appeals = await prisma.appeal.findMany();
      }
  } catch (dbError) {
       console.error('\n❌ 错误：查询数据库失败。', dbError);
       await prisma.$disconnect();
       process.exit(1);
  }

  console.log(`找到 ${appeals.length} 条记录需要检查。`);

  const results = {
    ok: 0,
    fixed: 0,
    skipped: 0,
    failed: 0
  };

  for (const appeal of appeals) {
    const result = await checkAndFixAppeal(appeal, autoFix, cryptoLib);
    results[result.status]++;
  }

  console.log('\n--- 修复完成 --- ');
  console.log(`总记录数: ${appeals.length}`);
  console.log(`✅ 正常: ${results.ok}`);
  console.log(`🔧 已修复: ${results.fixed}`);
  console.log(`⏭️ 跳过: ${results.skipped}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log('-------------------');

  await prisma.$disconnect();
}

// 直接调用主函数
main(); 