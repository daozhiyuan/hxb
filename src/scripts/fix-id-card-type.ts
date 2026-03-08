import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 修复历史数据中证件类型(idCardType)字段
 * 将customers和Appeal表中idCardType为NULL或空字符串的记录
 * 统一设置为'CHINA_MAINLAND'(中国大陆身份证)默认值
 */
async function main() {
  console.log('开始修复历史数据中的证件类型...');
  
  try {
    // 修复customers表 - 使用 Prisma Raw SQL
    const customersNullResult = await prisma.$executeRaw`
      UPDATE customers 
      SET idCardType = 'CHINA_MAINLAND' 
      WHERE idCardType IS NULL OR idCardType = ''
    `;
    
    console.log(`成功修复 ${customersNullResult} 条客户数据`);
    
    // 修复Appeal表 - 使用 Prisma Raw SQL
    const appealsNullResult = await prisma.$executeRaw`
      UPDATE Appeal 
      SET idCardType = 'CHINA_MAINLAND' 
      WHERE idCardType IS NULL OR idCardType = ''
    `;
    
    console.log(`成功修复 ${appealsNullResult} 条申诉数据`);
    
    console.log('历史数据修复完成。');
    
  } catch (error) {
    console.error('修复历史数据时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

export {};
