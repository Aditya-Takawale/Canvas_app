const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const [u,r,c] = await Promise.all([
      p.user.count(),
      p.room.count(),
      p.canvas.count()
    ]);
    console.log('Users:', u, '\nRooms:', r, '\nCanvases:', c);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await p.$disconnect();
  }
})();