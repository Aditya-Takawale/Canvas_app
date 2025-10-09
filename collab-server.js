// Simple WebSocket-based real-time collaboration server
const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = 8081;
const server = http.createServer();
const wss = new WebSocket.Server({ port: PORT });

// In-memory storage for real-time data
const rooms = new Map(); // roomId -> { users: Map, cursors: Map, drawings: [] }
const connections = new Map(); // ws -> { userId, roomId }

console.log(`🚀 Real-time Collaboration Server starting on port ${PORT}...`);

// Utility functions
function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

function getRoomData(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      cursors: new Map(),
      drawings: []
    });
  }
  return rooms.get(roomId);
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = getRoomData(roomId);
  room.users.forEach((userData, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        room.users.delete(ws);
      }
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const userId = generateUserId();
  const userColor = stringToColor(userId);
  
  console.log(`👤 User ${userId} connected from ${req.socket.remoteAddress}`);

  // Send user their ID and color
  ws.send(JSON.stringify({
    type: 'USER_INIT',
    userId,
    color: userColor
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message, userId);
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      // Send error back to client
      try {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
      } catch (e) {
        console.error('Failed to send error to client:', e);
      }
    }
  });

  ws.on('close', () => {
    console.log(`👤 User ${userId} disconnected`);
    handleDisconnect(ws, userId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${userId}:`, error);
  });
});

function handleMessage(ws, message, userId) {
  try {
    const { type, roomId } = message;

    switch (type) {
      case 'JOIN_ROOM':
        handleJoinRoom(ws, userId, roomId, message.username);
        break;
        
      case 'CURSOR_MOVE':
        handleCursorMove(ws, userId, message);
        break;
        
      case 'DRAWING_EVENT':
        handleDrawingEvent(ws, userId, message);
        break;
        
      case 'PING':
        ws.send(JSON.stringify({ type: 'PONG' }));
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  } catch (error) {
    console.error('❌ Error handling message:', error, message);
  }
}

function handleJoinRoom(ws, userId, roomId, username) {
  const room = getRoomData(roomId);
  const connection = connections.get(ws);
  
  // Leave previous room if any
  if (connection?.roomId) {
    const prevRoom = getRoomData(connection.roomId);
    prevRoom.users.delete(ws);
    prevRoom.cursors.delete(userId);
    broadcastToRoom(connection.roomId, {
      type: 'USER_LEFT',
      userId
    }, ws);
  }

  // Join new room
  room.users.set(ws, { userId, username: username, joinedAt: Date.now() });
  connections.set(ws, { userId, roomId });

  console.log(`👤 User ${userId} joined room ${roomId}`);

  // Send current room state to new user
  ws.send(JSON.stringify({
    type: 'ROOM_STATE',
    roomId,
    cursors: Object.fromEntries(room.cursors),
    users: Array.from(room.users.values()).map(u => ({
      userId: u.userId,
      username: u.username,
      color: stringToColor(u.userId)
    })),
    drawings: room.drawings
  }));

  // Notify other users about new user
  broadcastToRoom(roomId, {
    type: 'USER_JOINED',
    userId,
    username: username,
    color: stringToColor(userId)
  }, ws);
}

function handleCursorMove(ws, userId, message) {
  const connection = connections.get(ws);
  if (!connection) return;

  const { roomId } = connection;
  const room = getRoomData(roomId);
  
  // Update cursor position
  room.cursors.set(userId, {
    x: message.x,
    y: message.y,
    username: message.username,
    timestamp: Date.now()
  });

  // Broadcast cursor update to other users in room
  broadcastToRoom(roomId, {
    type: 'CURSOR_UPDATE',
    userId,
    username: message.username,
    x: message.x,
    y: message.y,
    color: stringToColor(userId)
  }, ws);
}

function handleDrawingEvent(ws, userId, message) {
  try {
    const connection = connections.get(ws);
    if (!connection) return;

    const { roomId } = connection;
    const room = getRoomData(roomId);
    
    // Extract the actual drawing data from message.data
    const drawingData = message.data;
    
    // Validate drawing data
    if (!drawingData || typeof drawingData !== 'object') {
      console.warn('⚠️ Invalid drawing data from', userId);
      return;
    }
    
    // Store drawing event with more detail
    const drawingEvent = {
      type: drawingData.type,
      data: drawingData.data,
      userId: drawingData.userId || userId,
      timestamp: Date.now(),
      color: stringToColor(userId)
    };
    
    // Store in room's drawing history
    room.drawings.push(drawingEvent);
    
    // Keep only last 1000 drawing events to prevent memory issues
    if (room.drawings.length > 1000) {
      room.drawings = room.drawings.slice(-1000);
    }

    console.log(`🎨 Drawing event from ${userId}: ${drawingData.type}`);

    // Broadcast drawing event to other users
    broadcastToRoom(roomId, {
      type: 'DRAWING_EVENT',
      drawingType: drawingEvent.type,
      data: drawingEvent.data,
      userId: drawingEvent.userId,
      timestamp: drawingEvent.timestamp,
      color: drawingEvent.color
    }, ws);
  } catch (error) {
    console.error('❌ Error handling drawing event:', error);
  }
}

function handleDisconnect(ws, userId) {
  const connection = connections.get(ws);
  if (!connection) return;

  const { roomId } = connection;
  const room = getRoomData(roomId);
  
  // Remove user from room
  room.users.delete(ws);
  room.cursors.delete(userId);
  connections.delete(ws);

  // Notify other users
  broadcastToRoom(roomId, {
    type: 'USER_LEFT',
    userId
  });

  // Clean up empty rooms
  if (room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`🧹 Cleaned up empty room ${roomId}`);
  }
}

// Cleanup inactive connections
setInterval(() => {
  const now = Date.now();
  connections.forEach((connection, ws) => {
    if (ws.readyState !== WebSocket.OPEN) {
      handleDisconnect(ws, connection.userId);
    }
  });
}, 30000);

// Process-level error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - keep server running
});

console.log(`✅ Real-time Collaboration Server ready on ws://localhost:${PORT}`);