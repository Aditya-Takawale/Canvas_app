const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestRoom() {
  try {
    console.log('Creating test private room...');
    
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const room = await prisma.room.create({
      data: {
        name: 'Test Private Room',
        description: 'A test private room for validation',
        isPrivate: true,
        joinCode: 'TESTCODE',
        password: hashedPassword,
        creatorId: 1,
        canvas: {
          create: {
            name: 'Test Canvas',
            width: 800,
            height: 600,
            creatorId: 1,
          },
        },
      },
      include: {
        creator: { 
          select: { 
            id: true, 
            username: true 
          } 
        }
      }
    });
    
    console.log('Created test private room:');
    console.log('- Name:', room.name);
    console.log('- Join Code:', room.joinCode);
    console.log('- Password: test123');
    console.log('- Creator:', room.creator.username);
    
  } catch (error) {
    console.error('Error creating room:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestRoom();