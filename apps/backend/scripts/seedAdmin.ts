import { config } from 'dotenv';
import { Role } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { createUser } from '../src/services/userService.js';

config();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@helpdesk.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
    return;
  }

  const user = await createUser({
    name: 'System Admin',
    email: adminEmail,
    password: adminPassword,
    role: Role.admin
  });

  console.log(`🎉 Created admin user ${user.email}`);
  console.log('👉 Please change the default password immediately.');
}

main()
  .catch((error) => {
    console.error('Failed to seed admin user', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
