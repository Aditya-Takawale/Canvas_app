import { Server, Socket } from 'socket.io';
import logger, { socketLogger } from '../utils/logger';
import { verifyJwtToken } from '../utils/auth';
import { DrawingEventData } from '../interfaces/socket';
import { SocketEvents } from '../utils/constants';

/**
 * Configure Socket.io server and handle socket connections
 * @param io - Socket.io server instance
 */
export const configureSocket = (io: Server): void => {
  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const ipAddress = socket.handshake.address;
      const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
      
      // Log authentication attempt
      socketLogger.debug({
        message: 'Socket authentication attempt',
        socketId: socket.id,
        ipAddress,
        userAgent,
        hasToken: !!token,
        timestamp: new Date().toISOString()
      });
      
      if (!token) {
        socketLogger.warn({
          message: 'Socket authentication failed - token missing',
          socketId: socket.id,
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString()
        });
        return next(new Error('Authentication error: Token required'));
      }
      
      const decoded = verifyJwtToken(token);
      socket.data.user = decoded;
      
      // Log successful authentication
      socketLogger.info({
        message: 'Socket authenticated successfully',
        socketId: socket.id,
        userId: decoded.id,
        email: decoded.email,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      });
      
      next();
    } catch (error) {
      socketLogger.error({
        message: 'Socket authentication error',
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
        timestamp: new Date().toISOString()
      });
      
      // Also log to main logger
      logger.error('Socket authentication error:', error);
      
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.id || 'unknown';
    const email = socket.data.user?.email || 'unknown';
    const ipAddress = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
    
    // Log connection
    socketLogger.info({
      message: 'User connected to socket',
      socketId: socket.id,
      userId,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    console.log('🔌 [BACKEND] New socket connection:', {
      socketId: socket.id,
      userId,
      email,
      timestamp: new Date().toISOString()
    });

    // Join a room
    socket.on(SocketEvents.JOIN_ROOM, async (roomId: string) => {
      try {
        socket.join(roomId);
        
        console.log('🏠 [BACKEND] User joined room:', {
          socketId: socket.id,
          userId,
          email,
          roomId,
          timestamp: new Date().toISOString()
        });
        
        // Log room join
        socketLogger.info({
          message: 'User joined room',
          socketId: socket.id,
          userId,
          email,
          roomId,
          timestamp: new Date().toISOString()
        });
        
        // Notify all users in the room that a new user has joined
        io.to(roomId).emit(SocketEvents.USER_JOINED, {
          userId,
          email,
          socketId: socket.id,
          timestamp: new Date(),
        });
        
        // Send current user count in the room
        const sockets = await io.in(roomId).fetchSockets();
        io.to(roomId).emit(SocketEvents.USER_COUNT, {
          count: sockets.length,
          roomId,
        });
        
        // Log current room state
        socketLogger.debug({
          message: 'Room status update',
          roomId,
          userCount: sockets.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // Log join room error
        socketLogger.error({
          message: 'Error joining room',
          socketId: socket.id,
          userId,
          email,
          roomId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        
        // Also log to main logger
        logger.error(`Error joining room ${roomId}:`, error);
        
        socket.emit(SocketEvents.ERROR, { message: 'Failed to join room' });
      }
    });

    // Leave a room
    socket.on(SocketEvents.LEAVE_ROOM, (roomId: string) => {
      socket.leave(roomId);
      
      // Log room leave
      socketLogger.info({
        message: 'User left room',
        socketId: socket.id,
        userId,
        email,
        roomId,
        timestamp: new Date().toISOString()
      });
      
      // Notify all users in the room that a user has left
      io.to(roomId).emit(SocketEvents.USER_LEFT, {
        userId,
        email,
        socketId: socket.id,
        timestamp: new Date(),
      });
    });

    // Handle drawing events
    socket.on(SocketEvents.DRAWING_EVENT, (data: DrawingEventData) => {
      // Add console.log for debugging as suggested
      console.log('🎨 [BACKEND] Received drawing data on server:', {
        roomId: data.roomId,
        objectType: data.objectType,
        action: data.action,
        hasObjectData: !!data.objectData,
        userId: data.userId,
        timestamp: new Date().toISOString()
      });
      
      // Log drawing events at debug level (high volume)
      socketLogger.debug({
        message: 'Drawing event',
        socketId: socket.id,
        userId,
        email,
        roomId: data.roomId,
        objectType: data.objectType,
        action: data.action,
        timestamp: new Date().toISOString()
      });
      
      // Use io.to() to broadcast to ALL clients in the room (including sender)
      // This ensures the drawing persists on the original client's canvas
      io.to(data.roomId).emit(SocketEvents.DRAWING_EVENT, {
        ...data,
        userId,
        email,
        timestamp: new Date(),
      });
      
      console.log('🚀 [BACKEND] Broadcasted drawing data to all clients in room:', data.roomId);
    });

    // Handle cursor movement
    socket.on(SocketEvents.CURSOR_MOVE, (data: { roomId: string; x: number; y: number }) => {
      // We don't log cursor moves as they are extremely high volume
      
      // Broadcast the cursor position to all OTHER clients in the room (following best practices)
      socket.to(data.roomId).emit('updateCursor', {
        userId,
        position: { x: data.x, y: data.y }
      });
    });
    
    // Handle chat messages
    socket.on(SocketEvents.CHAT_MESSAGE, (data: { roomId: string | number; userId: number; username: string; message: string; timestamp: string }) => {
      // Log chat message
      console.log('🗨️ [BACKEND] Chat message received:', {
        socketId: socket.id,
        userId,
        roomId: data.roomId,
        chatMessage: data.message.substring(0, 50), // Log only first 50 chars of message for privacy
        timestamp: new Date().toISOString()
      });
      
      socketLogger.info({
        message: 'Chat message received',
        socketId: socket.id,
        userId,
        email,
        roomId: data.roomId,
        chatMessage: data.message.substring(0, 50), // Log only first 50 chars of message for privacy
        timestamp: new Date().toISOString()
      });
      
      // Create message object with consistent ID format
      const messageObj = {
        id: `${Date.now()}-${data.userId}`,
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      
      // Broadcast the message to all clients in the room except the sender
      socket.to(data.roomId.toString()).emit(SocketEvents.CHAT_MESSAGE, messageObj);
      
      console.log('📤 [BACKEND] Chat message broadcasted to room:', data.roomId);
    });

    // Log all socket events for debugging
    socket.onAny((eventName, ...args) => {
      console.log('🎭 [BACKEND] Socket event received:', {
        eventName,
        socketId: socket.id,
        userId,
        argsCount: args.length,
        firstArg: args[0] ? JSON.stringify(args[0]).substring(0, 200) : 'none',
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnections
    socket.on('disconnect', async () => {
      // Log disconnection
      socketLogger.info({
        message: 'User disconnected from socket',
        socketId: socket.id,
        userId,
        email,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      });
      
      // Notify all rooms this socket was in about the disconnection
      const rooms = Array.from(socket.rooms);
      
      for (const roomId of rooms) {
        // Skip the default room (which is the socket's ID)
        if (roomId !== socket.id) {
          // Send USER_LEFT event for Redux state management
          io.to(roomId).emit(SocketEvents.USER_LEFT, {
            userId,
            email,
            socketId: socket.id,
            timestamp: new Date(),
          });
          
          // Send removeCursor event for cursor cleanup (following best practices)
          io.to(roomId).emit('removeCursor', userId);
          
          // Log leaving each room
          socketLogger.debug({
            message: 'User removed from room due to disconnect',
            socketId: socket.id,
            userId,
            email,
            roomId,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
  });
};
