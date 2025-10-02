import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Delete all drawing operations
    console.log('Deleting all drawing operations...');
    await prisma.drawingOperation.deleteMany({});
    console.log('All drawing operations deleted successfully');

    // Delete all canvases
    console.log('Deleting all canvases...');
    await prisma.canvas.deleteMany({});
    console.log('All canvases deleted successfully');

    // Delete all rooms
    console.log('Deleting all rooms...');
    await prisma.room.deleteMany({});
    console.log('All rooms deleted successfully');

    // Create fresh test rooms
    console.log('Creating new test rooms...');
    
    // Room 1 - General Drawing
    const room1 = await prisma.room.create({
      data: {
        name: 'General Drawing',
        description: 'A room for general drawing and sketching',
        isPrivate: false,
        joinCode: null,
        creatorId: 1,
      },
    });

    // Room 2 - Project Planning
    const room2 = await prisma.room.create({
      data: {
        name: 'Project Planning',
        description: 'For project diagrams and planning',
        isPrivate: false,
        joinCode: null,
        creatorId: 1,
      },
    });

    // Room 3 - Private Sketches
    const room3 = await prisma.room.create({
      data: {
        name: 'Private Sketches',
        description: 'My private sketching area',
        isPrivate: true,
        joinCode: '1234',
        creatorId: 1,
      },
    });

    // Create canvas for each room
    console.log('Creating canvases for each room...');
    
    await prisma.canvas.create({
      data: {
        name: 'General Canvas',
        width: 1200,
        height: 800,
        roomId: room1.id,
        creatorId: 1,
      },
    });

    await prisma.canvas.create({
      data: {
        name: 'Project Canvas',
        width: 1200,
        height: 800,
        roomId: room2.id,
        creatorId: 1,
      },
    });

    await prisma.canvas.create({
      data: {
        name: 'Private Canvas',
        width: 1200,
        height: 800,
        roomId: room3.id,
        creatorId: 1,
      },
    });

    console.log('Setup complete. Created 3 new rooms with empty canvases.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();