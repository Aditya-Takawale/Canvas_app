const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log('📤 Exporting SQLite data...\n');
    
    const users = await prisma.user.findMany();
    const rooms = await prisma.room.findMany();
    const canvases = await prisma.canvas.findMany();
    const operations = await prisma.drawingOperation.findMany();
    const connections = await prisma.roomConnection.findMany();
    
    const exportData = {
      users: users.map(u => ({
        username: u.username,
        email: u.email,
        password: u.password,
        role: u.role
      })),
      rooms: rooms.map(r => ({
        name: r.name,
        description: r.description,
        isPrivate: r.isPrivate,
        joinCode: r.joinCode,
        password: r.password,
        creatorEmail: users.find(u => u.id === r.creatorId)?.email
      })),
      canvases: canvases.map(c => ({
        name: c.name,
        width: c.width,
        height: c.height,
        state: c.state,
        roomName: rooms.find(r => r.id === c.roomId)?.name,
        creatorEmail: users.find(u => u.id === c.creatorId)?.email
      }))
    };
    
    fs.writeFileSync('data-export.json', JSON.stringify(exportData, null, 2));
    console.log('✅ Data exported to data-export.json');
    console.log(`📊 Exported: ${users.length} users, ${rooms.length} rooms, ${canvases.length} canvases`);
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();