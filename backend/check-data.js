const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function checkData() {
  try {
    console.log('🔍 Checking SQLite database data...\n');
    
    // Check users
    const users = await prisma.user.findMany();
    console.log(`👤 Users: ${users.length}`);
    if (users.length > 0) {
      console.log('Sample user:', users[0]);
    }
    
    // Check rooms  
    const rooms = await prisma.room.findMany();
    console.log(`🏠 Rooms: ${rooms.length}`);
    if (rooms.length > 0) {
      console.log('Sample room:', rooms[0]);
    }
    
    // Check canvases
    const canvases = await prisma.canvas.findMany();
    console.log(`🎨 Canvases: ${canvases.length}`);
    if (canvases.length > 0) {
      console.log('Sample canvas:', canvases[0]);
    }
    
    // Check drawing operations
    const operations = await prisma.drawingOperation.findMany();
    console.log(`✏️ Drawing Operations: ${operations.length}`);
    
    console.log('\n📊 Database Summary:');
    console.log(`Total records: ${users.length + rooms.length + canvases.length + operations.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();