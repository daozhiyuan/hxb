import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const adminPassword = 'adminpassword'; // Use a strong password in production!
  const partnerPassword = 'partnerpassword'; // Use a strong password in production!

  // Hash passwords
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const hashedPartnerPassword = await bcrypt.hash(partnerPassword, 10);

  // Create Admin User
  try {
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: hashedAdminPassword,
        role: Role.ADMIN,
      },
    });
    console.log(`Created/found admin user: ${adminUser.email}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }

  // Create Partner User
  try {
    const partnerUser = await prisma.user.upsert({
      where: { email: 'partner@example.com' },
      update: {},
      create: {
        email: 'partner@example.com',
        name: 'Partner One',
        passwordHash: hashedPartnerPassword,
        role: Role.PARTNER,
      },
    });
    console.log(`Created/found partner user: ${partnerUser.email}`);
  } catch (error) {
    console.error('Error creating partner user:', error);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
