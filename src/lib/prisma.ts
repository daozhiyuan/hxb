import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 从环境变量获取数据库连接字符串
const databaseUrl = process.env.DATABASE_URL || "mysql://root:password@db:3306/nextn";

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
