import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 创建超级管理员用户
  const superAdminPassword = await hash('superadmin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      name: '超级管理员',
      passwordHash: superAdminPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  // 创建管理员用户
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '系统管理员',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // 创建合作伙伴用户
  const partnerPassword = await hash('partner123', 12);
  const partner = await prisma.user.upsert({
    where: { email: 'partner@example.com' },
    update: {},
    create: {
      email: 'partner@example.com',
      name: '测试合作伙伴',
      passwordHash: partnerPassword,
      role: Role.PARTNER,
      isActive: true,
    },
  });

  // 创建普通用户
  const userPassword = await hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: '普通用户',
      passwordHash: userPassword,
      role: Role.USER,
      isActive: true,
    },
  });

  // 创建客户标签
  const tags = await Promise.all([
    prisma.customerTag.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'VIP客户',
        color: '#FFD700',
      },
    }),
    prisma.customerTag.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: '重点客户',
        color: '#FF4500',
      },
    }),
  ]);

  console.log('数据库初始化完成');
  console.log('超级管理员账号:', superAdmin.email);
  console.log('管理员账号:', admin.email);
  console.log('合作伙伴账号:', partner.email);
  console.log('普通用户账号:', user.email);
  console.log('创建的标签:', tags.map(tag => tag.name).join(', '));
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
