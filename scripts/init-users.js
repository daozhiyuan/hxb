import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function initUsers() {
  try {
    console.log('开始初始化用户账号...');

    // 创建超级管理员
    const superAdminPassword = await hashPassword('Super@Admin2024');
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@example.com' },
      update: {
        passwordHash: superAdminPassword,
        isActive: true,
        role: 'SUPER_ADMIN'
      },
      create: {
        email: 'superadmin@example.com',
        name: '超级管理员',
        passwordHash: superAdminPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log('超级管理员创建/更新成功！');

    // 创建系统管理员
    const adminPassword = await hashPassword('Sys@Admin2024');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        passwordHash: adminPassword,
        isActive: true,
        role: 'ADMIN'
      },
      create: {
        email: 'admin@example.com',
        name: '系统管理员',
        passwordHash: adminPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('系统管理员创建/更新成功！');

    // 创建合作伙伴
    const partnerPassword = await hashPassword('Partner@2024');
    const partner = await prisma.user.upsert({
      where: { email: 'partner@example.com' },
      update: {
        passwordHash: partnerPassword,
        isActive: true,
        role: 'PARTNER'
      },
      create: {
        email: 'partner@example.com',
        name: '合作伙伴',
        passwordHash: partnerPassword,
        role: 'PARTNER',
        isActive: true,
      },
    });
    console.log('合作伙伴创建/更新成功！');

    // 创建普通用户
    const userPassword = await hashPassword('User@2024');
    const user = await prisma.user.upsert({
      where: { email: 'Userr@example.com' },
      update: {
        passwordHash: userPassword,
        isActive: true,
        role: 'USER'
      },
      create: {
        email: 'Userr@example.com',
        name: '普通用户',
        passwordHash: userPassword,
        role: 'USER',
        isActive: true,
      },
    });
    console.log('普通用户创建/更新成功！');

    console.log('\n用户账号初始化完成！');
    console.log('\n账号信息：');
    console.log('1. 超级管理员');
    console.log('   邮箱：superadmin@example.com');
    console.log('   密码：Super@Admin2024');
    console.log('\n2. 系统管理员');
    console.log('   邮箱：admin@example.com');
    console.log('   密码：Sys@Admin2024');
    console.log('\n3. 合作伙伴');
    console.log('   邮箱：partner@example.com');
    console.log('   密码：Partner@2024');
    console.log('\n4. 普通用户');
    console.log('   邮箱：Userr@example.com');
    console.log('   密码：User@2024');
    console.log('\n请登录后立即修改默认密码以确保安全！');

  } catch (error) {
    console.error('初始化用户账号失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initUsers(); 