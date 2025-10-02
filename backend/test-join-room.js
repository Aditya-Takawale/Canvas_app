const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testJoinRoom() {
  try {
    console.log('🔍 Testing Join Room Functionality...\n');
    
    // Get all rooms
    const rooms = await prisma.room.findMany({
      include: {
        creator: {
          select: { id: true, username: true }
        }
      }
    });
    
    console.log('📋 Available Rooms:');
    rooms.forEach(room => {
      console.log(`- ID: ${room.id}, Name: "${room.name}", Private: ${room.isPrivate}, Creator: ${room.creator.username}`);
      if (room.isPrivate) {
        console.log(`  Join Code: ${room.joinCode}, Has Password: ${!!room.password}`);
      }
    });
    
    // Get all users
    const users = await prisma.user.findMany();
    
    console.log('\n👥 Available Users:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    console.log('\n🧪 Test Scenario:');
    const privateRoom = rooms.find(r => r.isPrivate);
    const regularUser = users.find(u => u.role !== 'admin');
    
    if (privateRoom && regularUser) {
      console.log(`Regular user "${regularUser.username}" trying to join private room "${privateRoom.name}"`);
      console.log(`Required: joinCode="${privateRoom.joinCode}", password=${privateRoom.password ? 'YES' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testJoinRoom();