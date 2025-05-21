import { PrismaClient } from '@prisma/client';
import { encryptIdCard, decryptIdCard } from '../lib/encryption';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

const prisma = new PrismaClient();

async function migrateCustomerData() {
  console.log('开始迁移客户数据...');
  
  const customers = await prisma.customer.findMany({
    where: {
      idCardNumberEncrypted: {
        not: null
      }
    }
  });

  console.log(`找到 ${customers.length} 条客户数据需要迁移`);

  let successCount = 0;
  let failedCount = 0;

  for (const customer of customers) {
    try {
      if (!customer.idCardNumberEncrypted) continue;
      const decrypted = decryptIdCard(customer.idCardNumberEncrypted);
      if (decrypted && !decrypted.startsWith('[')) {
        const reencrypted = encryptIdCard(decrypted);
        await prisma.customer.update({
          where: { id: customer.id },
          data: { idCardNumberEncrypted: reencrypted }
        });
        successCount++;
      } else {
        console.warn(`客户 ${customer.id} 的数据解密失败或格式不正确`);
        failedCount++;
      }
    } catch (error) {
      console.error(`迁移客户 ${customer.id} 数据时出错:`, error);
      failedCount++;
    }
  }

  console.log(`客户数据迁移完成: 成功 ${successCount} 条, 失败 ${failedCount} 条`);
}

async function migrateUserData() {
  console.log('开始迁移用户数据...');
  
  const users = await prisma.user.findMany({
    where: {
      idCardNumberEncrypted: {
        not: null
      }
    }
  });

  console.log(`找到 ${users.length} 条用户数据需要迁移`);

  let successCount = 0;
  let failedCount = 0;

  for (const user of users) {
    try {
      if (!user.idCardNumberEncrypted) continue;
      const decrypted = decryptIdCard(user.idCardNumberEncrypted);
      if (decrypted && !decrypted.startsWith('[')) {
        const reencrypted = encryptIdCard(decrypted);
        await prisma.user.update({
          where: { id: user.id },
          data: { idCardNumberEncrypted: reencrypted }
        });
        successCount++;
      } else {
        console.warn(`用户 ${user.id} 的数据解密失败或格式不正确`);
        failedCount++;
      }
    } catch (error) {
      console.error(`迁移用户 ${user.id} 数据时出错:`, error);
      failedCount++;
    }
  }

  console.log(`用户数据迁移完成: 成功 ${successCount} 条, 失败 ${failedCount} 条`);
}

async function migrateAppealData() {
  console.log('开始迁移申诉数据...');
  
  const appeals = await prisma.appeal.findMany({
    where: {
      idNumber: {
        not: null
      }
    }
  });

  console.log(`找到 ${appeals.length} 条申诉数据需要迁移`);

  let successCount = 0;
  let failedCount = 0;

  for (const appeal of appeals) {
    try {
      if (!appeal.idNumber) continue;
      const decrypted = decryptIdCard(appeal.idNumber);
      if (decrypted && !decrypted.startsWith('[')) {
        const reencrypted = encryptIdCard(decrypted);
        await prisma.appeal.update({
          where: { id: appeal.id },
          data: { idNumber: reencrypted }
        });
        successCount++;
      } else {
        console.warn(`申诉 ${appeal.id} 的数据解密失败或格式不正确`);
        failedCount++;
      }
    } catch (error) {
      console.error(`迁移申诉 ${appeal.id} 数据时出错:`, error);
      failedCount++;
    }
  }

  console.log(`申诉数据迁移完成: 成功 ${successCount} 条, 失败 ${failedCount} 条`);
}

async function main() {
  try {
    console.log('开始数据加密迁移...');
    
    await migrateCustomerData();
    await migrateUserData();
    await migrateAppealData();
    
    console.log('所有数据迁移完成！');
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 