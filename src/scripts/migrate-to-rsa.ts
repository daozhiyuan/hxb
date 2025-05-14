import { PrismaClient } from '@prisma/client';
import { reencryptData } from '../lib/encryption';

const prisma = new PrismaClient();

// 自动检测表字段
async function detectIdCardField(model: any, tableName: string): Promise<string | null> {
  // 可能的字段名，按优先级排列
  const candidates = ['idCardNumberEncrypted', 'idCardNumber', 'idNumber'];
  const sample = await model.findFirst();
  if (!sample) return null;
  for (const field of candidates) {
    if (field in sample) return field;
  }
  console.error(`${tableName} 表未检测到身份证号相关字段！`);
  return null;
}

async function migrateTable(model: any, tableName: string) {
  const idField = await detectIdCardField(model, tableName);
  if (!idField) return;
  console.log(`开始迁移 ${tableName} 表，身份证号字段：${idField}`);
  const records = await model.findMany({
    select: {
      id: true,
      [idField]: true,
    },
  });
  let successCount = 0;
  let failureCount = 0;
  for (const record of records) {
    try {
      if (!record[idField]) continue;
      const reencrypted = reencryptData(record[idField]);
      if (!reencrypted) {
        console.error(`${tableName} ${record.id} 重新加密失败`);
        failureCount++;
        continue;
      }
      await model.update({
        where: { id: record.id },
        data: { [idField]: reencrypted },
      });
      successCount++;
    } catch (error) {
      console.error(`迁移${tableName} ${record.id} 失败:`, error);
      failureCount++;
    }
  }
  console.log(`${tableName} 数据迁移完成：成功 ${successCount} 条，失败 ${failureCount} 条`);
}

async function main() {
  try {
    console.log('开始数据加密迁移...');
    await migrateTable(prisma.customer, 'customer');
    await migrateTable(prisma.appeal, 'appeal');
    console.log('数据加密迁移完成！');
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 