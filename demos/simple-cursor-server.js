const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Create WebSocket server directly on port 8081
const wss = new WebSocket.Server({ 
  port: 8081,
  perMessageDeflate: false 
});

// Store connected clients and their cursor data
const clients = new Map();
const cursors = new Map();

console.log('🚀 Simple Cursor WebSocket Server starting on port 8081...');

wss.on('connection', function connection(ws, request) {
  const userId = generateUserId();
  
  console.log(`👤 User ${userId} connected`);
  
  // Store client connection
  clients.set(userId, {
    ws: ws,
    userId: userId,
    isAlive: true,
    lastSeen: Date.now()
  });

  // Send user their ID
  ws.send(JSON.stringify({
    type: 'USER_ID',
    userId: userId
  }));

  // Send current cursors to new user
  const currentCursors = {};
  cursors.forEach((cursor, id) => {
    currentCursors[id] = cursor;
  });
  
  ws.send(JSON.stringify({
    type: 'CURSORS_UPDATE',
    cursors: currentCursors
  }));

  // Handle incoming messages
  ws.on('message', function incoming(data) {
    try {
      const message = JSON.parse(data);
      
      switch(message.type) {
        case 'CURSOR_MOVE':
          handleCursorMove(userId, message);
          break;
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle connection close
  ws.on('close', function close() {
    console.log(`👤 User ${userId} disconnected`);
    clients.delete(userId);
    cursors.delete(userId);
    
    // Notify all clients about user leaving
    broadcastCursors();
  });

  // Handle errors
  ws.on('error', function error(err) {
    console.error(`Error for user ${userId}:`, err);
  });

  // Heartbeat
  ws.on('pong', function heartbeat() {
    const client = clients.get(userId);
    if (client) {
      client.isAlive = true;
      client.lastSeen = Date.now();
    }
  });
});

function handleCursorMove(userId, message) {
  console.log(`📍 Cursor move from ${userId}: (${message.x}, ${message.y})`);
  
  // Update cursor position
  cursors.set(userId, {
    x: message.x,
    y: message.y,
    timestamp: Date.now()
  });

  // Broadcast to all other clients
  broadcastCursors(userId);
}

function broadcastCursors(excludeUserId = null) {
  const cursorsData = {};
  cursors.forEach((cursor, id) => {
    cursorsData[id] = cursor;
  });

  const message = JSON.stringify({
    type: 'CURSORS_UPDATE',
    cursors: cursorsData
  });

  console.log(`📡 Broadcasting cursors to ${clients.size} clients:`, Object.keys(cursorsData));

  clients.forEach((client, clientId) => {
    if (clientId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error);
      }
    }
  });
}

function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

// Cleanup inactive connections
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, userId) => {
    if (now - client.lastSeen > 60000) { // 1 minute timeout
      console.log(`🧹 Cleaning up inactive user ${userId}`);
      client.ws.terminate();
      clients.delete(userId);
      cursors.delete(userId);
      broadcastCursors();
    }
  });
}, 30000); // Check every 30 seconds

// Heartbeat to keep connections alive
setInterval(() => {
  clients.forEach((client, userId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.isAlive = false;
      client.ws.ping();
    }
  });
}, 25000); // Ping every 25 seconds

console.log('✅ Simple Cursor WebSocket Server ready on ws://localhost:8081');