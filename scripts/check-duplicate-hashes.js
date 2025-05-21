// 检查客户数据中的重复项
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkForDuplicates() {
  console.log('开始检查客户数据中的重复项...');
  
  try {
    // 1. 检查是否有重复的idCardHash
    const duplicateHashesQuery = `
      SELECT idCardHash, COUNT(*) as count 
      FROM customers 
      WHERE idCardHash IS NOT NULL 
      GROUP BY idCardHash 
      HAVING COUNT(*) > 1
    `;
    
    const duplicateHashes = await prisma.$queryRawUnsafe(duplicateHashesQuery);
    
    if (duplicateHashes.length > 0) {
      console.log('发现重复的idCardHash值:');
      for (const dup of duplicateHashes) {
        console.log(`Hash值: ${dup.idCardHash}, 出现次数: ${dup.count}`);
        
        // 查找具有此哈希值的所有客户
        const customers = await prisma.customer.findMany({
          where: { idCardHash: dup.idCardHash },
          select: {
            id: true,
            name: true,
            idCardHash: true,
            idCardNumberEncrypted: true,
            idCardType: true,
            registeredByPartnerId: true
          }
        });
        
        console.log('重复记录详情:');
        customers.forEach(customer => {
          console.log(`ID: ${customer.id}, 姓名: ${customer.name}, 证件类型: ${customer.idCardType || 'CHINA_MAINLAND'}, 合作伙伴ID: ${customer.registeredByPartnerId}`);
        });
      }
    } else {
      console.log('没有发现重复的idCardHash值。');
    }
    
    // 2. 检查有多少记录没有设置idCardType
    const missingTypeCount = await prisma.customer.count({
      where: {
        OR: [
          { idCardType: null },
          { idCardType: '' }
        ],
        idCardNumberEncrypted: { not: null }
      }
    });
    
    console.log(`发现 ${missingTypeCount} 条记录有证件号但没有设置证件类型。`);
    
    // 3. 检查各种证件类型的分布
    const typeDistribution = await prisma.$queryRaw`
      SELECT idCardType, COUNT(*) as count 
      FROM customers 
      WHERE idCardNumberEncrypted IS NOT NULL 
      GROUP BY idCardType
    `;
    
    console.log('证件类型分布:');
    typeDistribution.forEach(type => {
      console.log(`类型: ${type.idCardType || '未设置'}, 数量: ${type.count}`);
    });
    
    // 4. 检查无效的加密数据
    const invalidEncryptionCount = await prisma.customer.count({
      where: {
        idCardNumberEncrypted: { not: null },
        NOT: { idCardNumberEncrypted: { contains: ':' } }
      }
    });
    
    console.log(`发现 ${invalidEncryptionCount} 条记录的证件号格式可能无效（不包含冒号分隔符）。`);
    
    // 检查完成
    console.log('检查完成。');
    
  } catch (error) {
    console.error('检查过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行检查
checkForDuplicates()
  .then(() => console.log('脚本执行完成'))
  .catch(e => console.error('脚本执行失败:', e)); 