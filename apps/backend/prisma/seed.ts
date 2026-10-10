import argon2 from 'argon2';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();
const adminId = '00000000-0000-4000-8000-000000000001';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'AdminPassword123!';

async function main() {
    const existingAdmin = await prisma.user.findUnique({ where: { id: adminId } });
    if (existingAdmin) {
        return;
    }

    await prisma.user.create({
        data: {
            firstName: 'Platform',
            lastName: 'Administrator',
            passwordHash: await argon2.hash(adminPassword),
            role: UserRole.admin,
            status: UserStatus.active,
            id: adminId,
        },
    });
}

await main();
await prisma.$disconnect();
