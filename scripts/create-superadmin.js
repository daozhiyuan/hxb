// 创建超级管理员账户的脚本
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function createSuperAdmin() {
  try {
    console.log('开始创建超级管理员用户...');
    
    // 检查是否已存在超级管理员用户
    let superAdminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (superAdminUser) {
      console.log('超级管理员用户已存在，更新其密码...');
      await prisma.user.update({
        where: { id: superAdminUser.id },
        data: {
          passwordHash: await hashPassword('superadmin123'),
          isActive: true
        }
      });
      console.log('超级管理员密码已更新！');
    } else {
      // 创建超级管理员用户
      superAdminUser = await prisma.user.create({
        data: {
          name: '超级管理员',
          email: 'superadmin@example.com',
          passwordHash: await hashPassword('superadmin123'),
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });
      console.log('超级管理员用户创建成功！');
    }
    
    console.log('超级管理员账号:', superAdminUser.email);
    console.log('超级管理员密码: superadmin123');
    console.log('请登录后修改默认密码以确保安全');
  } catch (error) {
    console.error('创建超级管理员用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin(); 