import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// 从环境变量获取数据库连接字符串
const databaseUrl = process.env.DATABASE_URL || 'mysql://root:password@db:3306/nextn';

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
