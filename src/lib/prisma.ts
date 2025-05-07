import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 数据库连接字符串，使用正确的CRM数据库连接
const databaseUrl = "mysql://crmuser:crmpassword@localhost:3306/crm";

// Prevent multiple instances of Prisma Client in development
const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
