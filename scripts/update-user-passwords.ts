import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const NEW_PASSWORD = '51236688';

const usersToUpdate = [
  'superadmin@example.com',
  'admin@example.com',
  'partner@example.com',
  'user@example.com',
];

async function main() {
  console.log(`正在将新密码哈希化: ${NEW_PASSWORD}`);
  const newPasswordHash = await hash(NEW_PASSWORD, SALT_ROUNDS);
  console.log(`新密码的哈希值: ${newPasswordHash}`);

  for (const email of usersToUpdate) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        await prisma.user.update({
          where: { email },
          data: { passwordHash: newPasswordHash },
        });
        console.log(`用户 ${email} 的密码已成功更新。`);
      } else {
        console.warn(`未找到用户: ${email}，跳过更新。`);
      }
    } catch (error) {
      console.error(`更新用户 ${email} 密码时出错:`, error);
    }
  }

  console.log('所有指定用户的密码更新尝试完成。');
}

main()
  .catch((e) => {
    console.error('执行密码更新脚本时出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 