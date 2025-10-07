import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedUsers() {
  try {
    console.log('🌱 Starting database seeding...');

    // Check if users already exist
    const existingUsers = await prisma.user.count();
    console.log(`📊 Current user count: ${existingUsers}`);

    // Admin users
    const adminUsers = [
      {
        username: 'admin',
        email: 'admin@canvas.com',
        password: 'admin123',
        role: 'admin' as const
      },
      {
        username: 'superadmin',
        email: 'superadmin@canvas.com', 
        password: 'super123',
        role: 'admin' as const
      }
    ];

    // Test users
    const testUsers = [
      {
        username: 'alice',
        email: 'alice@test.com',
        password: 'alice123',
        role: 'user' as const
      },
      {
        username: 'bob',
        email: 'bob@test.com',
        password: 'bob123', 
        role: 'user' as const
      },
      {
        username: 'charlie',
        email: 'charlie@test.com',
        password: 'charlie123',
        role: 'user' as const
      },
      {
        username: 'diana',
        email: 'diana@test.com',
        password: 'diana123',
        role: 'user' as const
      },
      {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user' as const
      }
    ];

    const allUsers = [...adminUsers, ...testUsers];

    console.log(`👥 Creating ${allUsers.length} users...`);

    for (const userData of allUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: userData.email },
              { username: userData.username }
            ]
          }
        });

        if (existingUser) {
          console.log(`⏭️  User ${userData.username} (${userData.email}) already exists, skipping...`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user
        const user = await prisma.user.create({
          data: {
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
          }
        });

        console.log(`✅ Created ${userData.role}: ${user.username} (${user.email}) - ID: ${user.id}`);
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.username}:`, error);
      }
    }

    // Display final statistics
    const finalUserCount = await prisma.user.count();
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    const userCount = await prisma.user.count({ where: { role: 'user' } });

    console.log('\n🎉 Database seeding completed!');
    console.log(`📊 Final statistics:`);
    console.log(`   Total users: ${finalUserCount}`);
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Regular users: ${userCount}`);

    console.log('\n🔑 Login credentials:');
    console.log('   Admin accounts:');
    console.log('   - admin@canvas.com / admin123');
    console.log('   - superadmin@canvas.com / super123');
    console.log('\n   Test accounts:');
    console.log('   - alice@test.com / alice123');
    console.log('   - bob@test.com / bob123');
    console.log('   - charlie@test.com / charlie123');
    console.log('   - diana@test.com / diana123');
    console.log('   - test@example.com / password123');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedUsers()
  .then(() => {
    console.log('✅ Seeding script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding script failed:', error);
    process.exit(1);
  });