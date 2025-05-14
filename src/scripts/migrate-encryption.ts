import { PrismaClient } from '@prisma/client';
import { reencryptData } from '../lib/encryption.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

const prisma = new PrismaClient();

async function migrateEncryption() {
  console.log('开始数据加密迁移...');
  
  try {
    // 1. 迁移客户数据
    console.log('迁移客户数据...');
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        idCardNumberEncrypted: true,
      },
    });
    
    let customerSuccess = 0;
    let customerFailed = 0;
    
    for (const customer of customers) {
      if (!customer.idCardNumberEncrypted) continue;
      
      const newEncrypted = reencryptData(customer.idCardNumberEncrypted);
      if (newEncrypted) {
        try {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { idCardNumberEncrypted: newEncrypted },
          });
          customerSuccess++;
        } catch (error) {
          console.error(`更新客户 ${customer.id} 失败:`, error);
          customerFailed++;
        }
      } else {
        customerFailed++;
      }
    }
    
    console.log(`客户数据迁移完成: 成功 ${customerSuccess} 条, 失败 ${customerFailed} 条`);
    
    // 2. 迁移申诉数据
    console.log('迁移申诉数据...');
    const appeals = await prisma.appeal.findMany({
      select: {
        id: true,
        idNumber: true,
      },
    });
    
    let appealSuccess = 0;
    let appealFailed = 0;
    
    for (const appeal of appeals) {
      if (!appeal.idNumber) continue;
      
      const newEncrypted = reencryptData(appeal.idNumber);
      if (newEncrypted) {
        try {
          await prisma.appeal.update({
            where: { id: appeal.id },
            data: { idNumber: newEncrypted },
          });
          appealSuccess++;
        } catch (error) {
          console.error(`更新申诉 ${appeal.id} 失败:`, error);
          appealFailed++;
        }
      } else {
        appealFailed++;
      }
    }
    
    console.log(`申诉数据迁移完成: 成功 ${appealSuccess} 条, 失败 ${appealFailed} 条`);
    
    // 3. 迁移用户数据
    console.log('迁移用户数据...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        idCardNumberEncrypted: true,
      },
    });
    
    let userSuccess = 0;
    let userFailed = 0;
    
    for (const user of users) {
      if (!user.idCardNumberEncrypted) continue;
      
      const newEncrypted = reencryptData(user.idCardNumberEncrypted);
      if (newEncrypted) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { idCardNumberEncrypted: newEncrypted },
          });
          userSuccess++;
        } catch (error) {
          console.error(`更新用户 ${user.id} 失败:`, error);
          userFailed++;
        }
      } else {
        userFailed++;
      }
    }
    
    console.log(`用户数据迁移完成: 成功 ${userSuccess} 条, 失败 ${userFailed} 条`);
    
    console.log('数据加密迁移完成！');
    
  } catch (error) {
    console.error('数据迁移过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行迁移
migrateEncryption()
  .then(() => {
    console.log('迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  }); 