const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection and tables...\n');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test if tables exist by trying to count users
    const userCount = await prisma.user.count();
    console.log(`✅ Users table exists - Count: ${userCount}`);
    
    const roomCount = await prisma.room.count();
    console.log(`✅ Rooms table exists - Count: ${roomCount}`);
    
    const canvasCount = await prisma.canvas.count();
    console.log(`✅ Canvas table exists - Count: ${canvasCount}`);
    
    console.log('\n🎉 All database tables are working correctly!');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    if (error.code === 'P2021') {
      console.log('🚨 Tables do not exist - migration needed');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();