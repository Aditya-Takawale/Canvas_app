const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRooms() {
  try {
    console.log('Checking all rooms in database...');
    
    const rooms = await prisma.room.findMany({
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    console.log(`Found ${rooms.length} rooms:`);
    rooms.forEach(room => {
      console.log(`- ID: ${room.id}, Name: "${room.name}", Private: ${room.isPrivate}, Creator: ${room.creator.username}, JoinCode: ${room.joinCode || 'none'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRooms();