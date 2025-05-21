const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// 创建Prisma客户端
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "mysql://crmuser:crmpassword@localhost:3306/crm"
    }
  }
});

// 使用bcrypt哈希函数与系统登录验证兼容
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// 创建测试用户
async function createTestUser() {
  try {
    console.log('开始创建测试用户...');
    
    // 检查是否已存在管理员用户
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (adminUser) {
      console.log('管理员用户已存在，更新其密码...');
      await prisma.user.update({
        where: { email: 'admin@example.com' },
        data: {
          passwordHash: await hashPassword('password123'),
          isActive: true
        }
      });
      console.log('管理员密码已更新！');
    } else {
      // 创建管理员用户
      adminUser = await prisma.user.create({
        data: {
          name: '管理员',
          email: 'admin@example.com',
          passwordHash: await hashPassword('password123'),
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('管理员用户创建成功！');
    }
    
    // 检查是否已存在合作伙伴用户
    let partnerUser = await prisma.user.findUnique({
      where: { email: 'partner@example.com' }
    });
    
    if (partnerUser) {
      console.log('合作伙伴用户已存在，更新其密码...');
      await prisma.user.update({
        where: { email: 'partner@example.com' },
        data: {
          passwordHash: await hashPassword('password123'),
          isActive: true,
          role: 'PARTNER'
        }
      });
      console.log('合作伙伴密码已更新！');
    } else {
      // 创建合作伙伴用户
      partnerUser = await prisma.user.create({
        data: {
          name: '合作伙伴',
          email: 'partner@example.com',
          passwordHash: await hashPassword('password123'),
          role: 'PARTNER',
          isActive: true
        }
      });
      console.log('合作伙伴用户创建成功！');
    }
    
    // 为系统中已有的客户数据关联合作伙伴
    const customersWithoutPartner = await prisma.customer.findMany({
      where: {
        registeredByPartnerId: { 
          not: partnerUser.id 
        }
      }
    });
    
    if (customersWithoutPartner.length > 0) {
      console.log(`更新${customersWithoutPartner.length}条客户记录的关联伙伴...`);
      for (const customer of customersWithoutPartner) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { 
            registeredByPartnerId: partnerUser.id 
          }
        });
      }
      console.log('客户关联伙伴更新完成！');
    }
    
    console.log('测试用户创建/更新成功！');
  } catch (error) {
    console.error('创建测试用户时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行创建用户
createTestUser()
  .then(() => console.log('脚本执行完毕'))
  .catch(error => console.error('脚本执行失败:', error)); 