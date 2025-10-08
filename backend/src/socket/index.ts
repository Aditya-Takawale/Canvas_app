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
  // Username may now be present in JWT payload; fallback gracefully
  const username = socket.data.user?.username || (typeof email === 'string' ? email.split('@')[0] : `User${userId}`);
    const ipAddress = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
    const isDev = process.env.NODE_ENV === 'development';
    
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
    if (isDev) {
      socketLogger.debug({
        message: 'New socket connection (dev log)',
        socketId: socket.id,
        userId,
        email,
        timestamp: new Date().toISOString()
      });
    }

    // Join a room
    socket.on(SocketEvents.JOIN_ROOM, async (roomId: string) => {
      try {
        socket.join(roomId);
        
        if (isDev) {
          socketLogger.debug({
            message: 'User joined room (dev log)',
            socketId: socket.id,
            userId,
            email,
            roomId,
            timestamp: new Date().toISOString()
          });
        }
        
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
          username,
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
      if (isDev) {
        socketLogger.debug({
          message: 'Received drawing data (dev log)',
          roomId: data.roomId,
          objectType: data.objectType,
          action: data.action,
          hasObjectData: !!data.objectData,
          userId: data.userId,
          timestamp: new Date().toISOString()
        });
      }
      
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
      
      // Broadcast to OTHER clients in the room (excluding sender)
      // This prevents feedback loops while ensuring real-time sync
      socket.to(data.roomId).emit(SocketEvents.DRAWING_EVENT, {
        ...data,
        userId,
        email,
        timestamp: new Date(),
      });
      
      if (isDev) {
        socketLogger.debug({ message: 'Broadcasted drawing data', roomId: data.roomId });
      }
    });

    // Handle instant drawing events (like chat - direct broadcast)
    socket.on('INSTANT_DRAWING', (data: { roomId: string; drawingData: any; action: string }) => {
      if (isDev) {
        socketLogger.debug({
          message: 'Instant drawing received (dev log)',
          roomId: data.roomId,
          action: data.action,
          hasDrawingData: !!data.drawingData,
          userId,
          timestamp: new Date().toISOString()
        });
      }
      
      // Broadcast immediately to OTHER clients (like chat)
      socket.to(data.roomId).emit('INSTANT_DRAWING', {
        drawingData: data.drawingData,
        action: data.action,
        userId,
        email,
        timestamp: new Date().toISOString()
      });
      
      if (isDev) {
        socketLogger.debug({ message: 'Instant drawing broadcasted', roomId: data.roomId });
      }
    });

    // Handle cursor movement (standard event)
    socket.on(SocketEvents.CURSOR_MOVE, (data: { roomId: string; x: number; y: number }) => {
      // Lightweight emission: broadcast with canonical event AND legacy fallback
      const payload = { 
        userId,
        username,
        x: data.x,
        y: data.y,
        roomId: data.roomId,
        ts: Date.now()
      };
      // Canonical event
      socket.to(data.roomId).emit(SocketEvents.CURSOR_MOVE, payload);
      // Legacy event kept temporarily (frontend still listening for updateCursor in some components)
      socket.to(data.roomId).emit('updateCursor', {
        userId,
        username,
        position: { x: data.x, y: data.y }
      });
    });

    // Handle user color updates
    socket.on(SocketEvents.USER_COLOR_UPDATE, (data: { roomId: string; color: string }) => {
      try {
        if (!data?.roomId || !data?.color) return;
        const payload = {
          userId,
          username,
          color: data.color,
          roomId: data.roomId,
          ts: Date.now()
        };
        socket.to(data.roomId).emit(SocketEvents.USER_COLOR_UPDATE, payload);
        // Also echo back to sender for confirmation (optional)
        socket.emit(SocketEvents.USER_COLOR_UPDATE, payload);
      } catch (err) {
        socket.emit(SocketEvents.ERROR, { message: 'Failed to update user color' });
      }
    });
    
    // Handle chat messages
    socket.on(SocketEvents.CHAT_MESSAGE, (data: { roomId: string | number; userId: number; username: string; message: string; timestamp: string }) => {
      // Log chat message
      if (isDev) {
        socketLogger.debug({
          message: 'Chat message received (dev log)',
          socketId: socket.id,
          userId,
          roomId: data.roomId,
          chatMessage: data.message.substring(0, 50),
          timestamp: new Date().toISOString()
        });
      }
      
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
      
      if (isDev) {
        socketLogger.debug({ message: 'Chat message broadcasted', roomId: data.roomId });
      }
    });

    // ================================
    // WebRTC Signaling Events
    // ================================
    
    // Handle call invitation
    socket.on('call-invite', (data: { roomId: string | number; targetUserId: string; callType: 'voice' | 'video'; offer: any }) => {
      try {
        const { roomId, targetUserId, callType, offer } = data;
        
        socketLogger.info({
          message: `Call invitation sent`,
          socketId: socket.id,
          userId,
          roomId,
          targetUserId,
          callType,
          timestamp: new Date().toISOString()
        });

        // Find target user's socket in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());
        let targetFound = false;
        
        if (isDev) {
          socketLogger.debug({ message: 'Searching for target user (call invite)', targetUserId, roomId, roomSocketCount: roomSockets?.size || 0 });
        }
        
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (isDev) {
              socketLogger.debug({ message: 'Inspecting socket while searching target', candidateSocketId: socketId, candidateUserId: targetSocket?.data.user?.id });
            }
            
            if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
              if (isDev) {
                socketLogger.debug({ message: 'Found target user for call invite', targetUserId });
              }
              targetSocket.emit('call-invite', {
                callerId: userId.toString(),
                callerName: targetSocket.data.user.username || email,
                callType,
                offer,
              });
              targetFound = true;
              break;
            }
          }
        }
        
        if (!targetFound) {
          if (isDev) {
            socketLogger.debug({ message: 'Target user not found for call invite', targetUserId, roomId });
          }
          socketLogger.warn({
            message: 'Target user not found for call invitation',
            socketId: socket.id,
            userId,
            targetUserId,
            roomId,
            roomSocketCount: roomSockets?.size || 0,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling call invitation',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle call acceptance
    socket.on('call-accept', (data: { roomId: string | number; targetUserId: string }) => {
      try {
        const { roomId, targetUserId } = data;
        
        socketLogger.info({
          message: `Call accepted`,
          socketId: socket.id,
          userId,
          roomId,
          targetUserId,
          timestamp: new Date().toISOString()
        });

        // Find target user's socket in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
              targetSocket.emit('call-accept', {
                accepterId: userId.toString(),
              });
              break;
            }
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling call acceptance',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle call rejection
    socket.on('call-reject', (data: { roomId: string | number; targetUserId: string }) => {
      try {
        const { roomId, targetUserId } = data;
        
        socketLogger.info({
          message: `Call rejected`,
          socketId: socket.id,
          userId,
          roomId,
          targetUserId,
          timestamp: new Date().toISOString()
        });

        // Find target user's socket in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
              targetSocket.emit('call-reject');
              break;
            }
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling call rejection',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle call end
    socket.on('call-end', (data: { roomId: string | number; targetUserId: string }) => {
      try {
        const { roomId, targetUserId } = data;
        
        socketLogger.info({
          message: `Call ended`,
          socketId: socket.id,
          userId,
          roomId,
          targetUserId,
          timestamp: new Date().toISOString()
        });

        // Find target user's socket in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
              targetSocket.emit('call-end');
              break;
            }
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling call end',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle WebRTC offer
    socket.on('offer', (data: { roomId: string | number; targetUserId: string; offer: any }) => {
      try {
        const { roomId, targetUserId, offer } = data;
        
        // Find target user's socket in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
              targetSocket.emit('offer', {
                callerId: userId.toString(),
                offer,
              });
              break;
            }
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling WebRTC offer',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle WebRTC answer
    socket.on('answer', (data: { roomId: string | number; targetUserId: string; answer: any }) => {
      try {
        const { roomId, targetUserId, answer } = data;
        
        // Find target user's socket in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
              targetSocket.emit('answer', {
                answer,
              });
              break;
            }
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling WebRTC answer',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data: { roomId: string | number; targetUserId: string; candidate: any }) => {
      try {
        const { roomId, targetUserId, candidate } = data;
        
        // Find target user's socket in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId.toString());
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
              targetSocket.emit('ice-candidate', {
                candidate,
              });
              break;
            }
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling ICE candidate',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Log all socket events for debugging
    socket.onAny((eventName, ...args) => {
      if (isDev) {
        socketLogger.debug({
          message: 'Socket event received (onAny)',
          eventName,
          socketId: socket.id,
          userId,
          argsCount: args.length,
          firstArg: args[0] ? JSON.stringify(args[0]).substring(0, 200) : 'none',
          timestamp: new Date().toISOString()
        });
      }
    });

    // WebRTC Room Management
    socket.on('join-webrtc-room', (data: { roomId: string | number; roomType: 'audio' | 'video'; userId: string; userName: string }) => {
      try {
        const { roomId, roomType, userId, userName } = data;
        const webrtcRoomId = `webrtc-${roomType}-${roomId}`;
        
        socketLogger.info({
          message: `User joining ${roomType} room`,
          socketId: socket.id,
          userId,
          userName,
          roomId,
          roomType,
          timestamp: new Date().toISOString()
        });

        // Join the WebRTC room
        socket.join(webrtcRoomId);
        
        // Notify other participants in the room
        socket.to(webrtcRoomId).emit('participant-joined-webrtc', {
          userId,
          userName,
          roomType,
        });

        // Get current participants and send to new user
        const roomSockets = io.sockets.adapter.rooms.get(webrtcRoomId);
        if (roomSockets) {
          const currentParticipants: any[] = [];
          for (const socketId of roomSockets) {
            const participantSocket = io.sockets.sockets.get(socketId);
            if (participantSocket && participantSocket.id !== socket.id && participantSocket.data.user) {
              currentParticipants.push({
                userId: participantSocket.data.user.id.toString(),
                userName: participantSocket.data.user.username,
              });
            }
          }

          // Send current participants to the new user
          socket.emit('webrtc-room-participants', {
            participants: currentParticipants,
            roomType,
          });
        }

      } catch (error) {
        socketLogger.error({
          message: 'Error joining WebRTC room',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('leave-webrtc-room', (data: { roomId: string | number; userId: string }) => {
      try {
        const { roomId, userId } = data;
        const audioRoomId = `webrtc-audio-${roomId}`;
        const videoRoomId = `webrtc-video-${roomId}`;
        
        socketLogger.info({
          message: 'User leaving WebRTC room',
          socketId: socket.id,
          userId,
          roomId,
          timestamp: new Date().toISOString()
        });

        // Leave both audio and video rooms
        socket.leave(audioRoomId);
        socket.leave(videoRoomId);
        
        // Notify other participants
        socket.to(audioRoomId).emit('participant-left-webrtc', {
          userId,
          userName: socket.data.user?.username || 'Unknown',
        });
        socket.to(videoRoomId).emit('participant-left-webrtc', {
          userId,
          userName: socket.data.user?.username || 'Unknown',
        });

      } catch (error) {
        socketLogger.error({
          message: 'Error leaving WebRTC room',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', (data: { roomId: string | number; offer: any; targetUserId: string }) => {
      try {
        const { roomId, offer, targetUserId } = data;
        
        socketLogger.info({
          message: 'WebRTC offer sent',
          socketId: socket.id,
          userId,
          targetUserId,
          roomId,
          timestamp: new Date().toISOString()
        });

        // Find target user's socket in WebRTC rooms
        const audioRoomId = `webrtc-audio-${roomId}`;
        const videoRoomId = `webrtc-video-${roomId}`;
        
        const audioRoom = io.sockets.adapter.rooms.get(audioRoomId);
        const videoRoom = io.sockets.adapter.rooms.get(videoRoomId);
        
        const allRoomSockets = new Set([
          ...(audioRoom || []),
          ...(videoRoom || [])
        ]);

        for (const socketId of allRoomSockets) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
            targetSocket.emit('webrtc-offer', {
              offer,
              fromUserId: userId,
              fromUserName: socket.data.user?.username || 'Unknown',
            });
            break;
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling WebRTC offer',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('webrtc-answer', (data: { roomId: string | number; answer: any; targetUserId: string }) => {
      try {
        const { roomId, answer, targetUserId } = data;
        
        socketLogger.info({
          message: 'WebRTC answer sent',
          socketId: socket.id,
          userId,
          targetUserId,
          roomId,
          timestamp: new Date().toISOString()
        });

        // Find target user's socket in WebRTC rooms
        const audioRoomId = `webrtc-audio-${roomId}`;
        const videoRoomId = `webrtc-video-${roomId}`;
        
        const audioRoom = io.sockets.adapter.rooms.get(audioRoomId);
        const videoRoom = io.sockets.adapter.rooms.get(videoRoomId);
        
        const allRoomSockets = new Set([
          ...(audioRoom || []),
          ...(videoRoom || [])
        ]);

        for (const socketId of allRoomSockets) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
            targetSocket.emit('webrtc-answer', {
              answer,
              fromUserId: userId,
              fromUserName: socket.data.user?.username || 'Unknown',
            });
            break;
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling WebRTC answer',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('webrtc-ice-candidate', (data: { roomId: string | number; candidate: any; targetUserId: string }) => {
      try {
        const { roomId, candidate, targetUserId } = data;
        
        // Find target user's socket in WebRTC rooms
        const audioRoomId = `webrtc-audio-${roomId}`;
        const videoRoomId = `webrtc-video-${roomId}`;
        
        const audioRoom = io.sockets.adapter.rooms.get(audioRoomId);
        const videoRoom = io.sockets.adapter.rooms.get(videoRoomId);
        
        const allRoomSockets = new Set([
          ...(audioRoom || []),
          ...(videoRoom || [])
        ]);

        for (const socketId of allRoomSockets) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
            targetSocket.emit('webrtc-ice-candidate', {
              candidate,
              fromUserId: userId,
              fromUserName: socket.data.user?.username || 'Unknown',
            });
            break;
          }
        }
      } catch (error) {
        socketLogger.error({
          message: 'Error handling WebRTC ICE candidate',
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
          userId,
          timestamp: new Date().toISOString()
        });
      }
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
