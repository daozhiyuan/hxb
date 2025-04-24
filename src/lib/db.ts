import { PrismaClient } from '@prisma/client';

// 明确指定数据库连接信息
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: "mysql://nextn:nextn@localhost:3306/nextn"
      }
    }
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma; 