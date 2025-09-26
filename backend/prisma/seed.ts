import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('Starting database seeding...');

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'admin',
      },
    });

    console.log(`Created admin user with ID: ${adminUser.id}`);

    // Create regular user
    const userPassword = await hashPassword('user123');
    const regularUser = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        username: 'user',
        email: 'user@example.com',
        password: userPassword,
        role: 'user',
      },
    });

    console.log(`Created regular user with ID: ${regularUser.id}`);

    // Create a sample room
    const room = await prisma.room.create({
      data: {
        name: 'Sample Drawing Room',
        description: 'This is a sample room for drawing',
        isPrivate: false,
        creatorId: adminUser.id,
        canvas: {
          create: {
            name: 'Sample Canvas',
            width: 800,
            height: 600,
            creatorId: adminUser.id,
          },
        },
      },
      include: {
        canvas: true,
      },
    });

    console.log(`Created room with ID: ${room.id} and canvas with ID: ${room.canvas?.id}`);

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();