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

  // Create Admin User - SET isActive to TRUE
  try {
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        isActive: true, // Ensure admin is active on update as well
      },
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: hashedAdminPassword,
        role: Role.ADMIN,
        isActive: true, // Set admin user to active upon creation
      },
    });
    console.log(`Created/found and activated admin user: ${adminUser.email}`);
  } catch (error) {
    console.error('Error creating/updating admin user:', error);
  }

  // Create Partner User - SET isActive to TRUE
  try {
    const partnerUser = await prisma.user.upsert({
      where: { email: 'partner@example.com' },
      update: {
         isActive: true, // Ensure partner is active on update as well
      },
      create: {
        email: 'partner@example.com',
        name: 'Partner One',
        passwordHash: hashedPartnerPassword,
        role: Role.PARTNER,
        isActive: true, // Set partner user to active upon creation
      },
    });
    console.log(`Created/found and activated partner user: ${partnerUser.email}`);
  } catch (error) {
    console.error('Error creating/updating partner user:', error);
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
