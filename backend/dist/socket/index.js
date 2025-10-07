"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSocket = void 0;
const logger_1 = __importStar(require("../utils/logger"));
const auth_1 = require("../utils/auth");
const constants_1 = require("../utils/constants");
/**
 * Configure Socket.io server and handle socket connections
 * @param io - Socket.io server instance
 */
const configureSocket = (io) => {
    // Socket authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            const ipAddress = socket.handshake.address;
            const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
            // Log authentication attempt
            logger_1.socketLogger.debug({
                message: 'Socket authentication attempt',
                socketId: socket.id,
                ipAddress,
                userAgent,
                hasToken: !!token,
                timestamp: new Date().toISOString()
            });
            if (!token) {
                logger_1.socketLogger.warn({
                    message: 'Socket authentication failed - token missing',
                    socketId: socket.id,
                    ipAddress,
                    userAgent,
                    timestamp: new Date().toISOString()
                });
                return next(new Error('Authentication error: Token required'));
            }
            const decoded = (0, auth_1.verifyJwtToken)(token);
            socket.data.user = decoded;
            // Log successful authentication
            logger_1.socketLogger.info({
                message: 'Socket authenticated successfully',
                socketId: socket.id,
                userId: decoded.id,
                email: decoded.email,
                ipAddress,
                userAgent,
                timestamp: new Date().toISOString()
            });
            next();
        }
        catch (error) {
            logger_1.socketLogger.error({
                message: 'Socket authentication error',
                socketId: socket.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                ipAddress: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
                timestamp: new Date().toISOString()
            });
            // Also log to main logger
            logger_1.default.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });
    // Handle socket connections
    io.on('connection', (socket) => {
        const userId = socket.data.user?.id || 'unknown';
        const email = socket.data.user?.email || 'unknown';
        const ipAddress = socket.handshake.address;
        const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
        // Log connection
        logger_1.socketLogger.info({
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
        socket.on(constants_1.SocketEvents.JOIN_ROOM, async (roomId) => {
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
                logger_1.socketLogger.info({
                    message: 'User joined room',
                    socketId: socket.id,
                    userId,
                    email,
                    roomId,
                    timestamp: new Date().toISOString()
                });
                // Notify all users in the room that a new user has joined
                io.to(roomId).emit(constants_1.SocketEvents.USER_JOINED, {
                    userId,
                    email,
                    socketId: socket.id,
                    timestamp: new Date(),
                });
                // Send current user count in the room
                const sockets = await io.in(roomId).fetchSockets();
                io.to(roomId).emit(constants_1.SocketEvents.USER_COUNT, {
                    count: sockets.length,
                    roomId,
                });
                // Log current room state
                logger_1.socketLogger.debug({
                    message: 'Room status update',
                    roomId,
                    userCount: sockets.length,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                // Log join room error
                logger_1.socketLogger.error({
                    message: 'Error joining room',
                    socketId: socket.id,
                    userId,
                    email,
                    roomId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
                // Also log to main logger
                logger_1.default.error(`Error joining room ${roomId}:`, error);
                socket.emit(constants_1.SocketEvents.ERROR, { message: 'Failed to join room' });
            }
        });
        // Leave a room
        socket.on(constants_1.SocketEvents.LEAVE_ROOM, (roomId) => {
            socket.leave(roomId);
            // Log room leave
            logger_1.socketLogger.info({
                message: 'User left room',
                socketId: socket.id,
                userId,
                email,
                roomId,
                timestamp: new Date().toISOString()
            });
            // Notify all users in the room that a user has left
            io.to(roomId).emit(constants_1.SocketEvents.USER_LEFT, {
                userId,
                email,
                socketId: socket.id,
                timestamp: new Date(),
            });
        });
        // Handle drawing events
        socket.on(constants_1.SocketEvents.DRAWING_EVENT, (data) => {
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
            logger_1.socketLogger.debug({
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
            socket.to(data.roomId).emit(constants_1.SocketEvents.DRAWING_EVENT, {
                ...data,
                userId,
                email,
                timestamp: new Date(),
            });
            console.log('🚀 [BACKEND] Broadcasted drawing data to other clients in room:', data.roomId);
        });
        // Handle instant drawing events (like chat - direct broadcast)
        socket.on('INSTANT_DRAWING', (data) => {
            console.log('⚡ [BACKEND] Instant drawing received:', {
                roomId: data.roomId,
                action: data.action,
                hasDrawingData: !!data.drawingData,
                userId,
                timestamp: new Date().toISOString()
            });
            // Broadcast immediately to OTHER clients (like chat)
            socket.to(data.roomId).emit('INSTANT_DRAWING', {
                drawingData: data.drawingData,
                action: data.action,
                userId,
                email,
                timestamp: new Date().toISOString()
            });
            console.log('⚡ [BACKEND] Instant drawing broadcasted to room:', data.roomId);
        });
        // Handle cursor movement
        socket.on(constants_1.SocketEvents.CURSOR_MOVE, (data) => {
            // We don't log cursor moves as they are extremely high volume
            // Broadcast the cursor position to all OTHER clients in the room (excluding sender)
            socket.to(data.roomId).emit('updateCursor', {
                userId,
                position: { x: data.x, y: data.y }
            });
        });
        // Handle chat messages
        socket.on(constants_1.SocketEvents.CHAT_MESSAGE, (data) => {
            // Log chat message
            console.log('🗨️ [BACKEND] Chat message received:', {
                socketId: socket.id,
                userId,
                roomId: data.roomId,
                chatMessage: data.message.substring(0, 50), // Log only first 50 chars of message for privacy
                timestamp: new Date().toISOString()
            });
            logger_1.socketLogger.info({
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
            socket.to(data.roomId.toString()).emit(constants_1.SocketEvents.CHAT_MESSAGE, messageObj);
            console.log('📤 [BACKEND] Chat message broadcasted to room:', data.roomId);
        });
        // ================================
        // WebRTC Signaling Events
        // ================================
        // Handle call invitation
        socket.on('call-invite', (data) => {
            try {
                const { roomId, targetUserId, callType, offer } = data;
                logger_1.socketLogger.info({
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
                console.log(`🔍 Looking for target user ${targetUserId} in room ${roomId}`);
                console.log(`📍 Room has ${roomSockets?.size || 0} connected sockets`);
                if (roomSockets) {
                    for (const socketId of roomSockets) {
                        const targetSocket = io.sockets.sockets.get(socketId);
                        console.log(`🔍 Checking socket ${socketId}, user: ${targetSocket?.data.user?.id}`);
                        if (targetSocket && targetSocket.data.user?.id.toString() === targetUserId) {
                            console.log(`✅ Found target user ${targetUserId}, sending call invitation`);
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
                    console.log(`❌ Target user ${targetUserId} not found in room ${roomId}`);
                    logger_1.socketLogger.warn({
                        message: 'Target user not found for call invitation',
                        socketId: socket.id,
                        userId,
                        targetUserId,
                        roomId,
                        roomSocketCount: roomSockets?.size || 0,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling call invitation',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Handle call acceptance
        socket.on('call-accept', (data) => {
            try {
                const { roomId, targetUserId } = data;
                logger_1.socketLogger.info({
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling call acceptance',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Handle call rejection
        socket.on('call-reject', (data) => {
            try {
                const { roomId, targetUserId } = data;
                logger_1.socketLogger.info({
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling call rejection',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Handle call end
        socket.on('call-end', (data) => {
            try {
                const { roomId, targetUserId } = data;
                logger_1.socketLogger.info({
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling call end',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Handle WebRTC offer
        socket.on('offer', (data) => {
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling WebRTC offer',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Handle WebRTC answer
        socket.on('answer', (data) => {
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling WebRTC answer',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Handle ICE candidates
        socket.on('ice-candidate', (data) => {
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
            }
            catch (error) {
                logger_1.socketLogger.error({
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
            console.log('🎭 [BACKEND] Socket event received:', {
                eventName,
                socketId: socket.id,
                userId,
                argsCount: args.length,
                firstArg: args[0] ? JSON.stringify(args[0]).substring(0, 200) : 'none',
                timestamp: new Date().toISOString()
            });
        });
        // WebRTC Room Management
        socket.on('join-webrtc-room', (data) => {
            try {
                const { roomId, roomType, userId, userName } = data;
                const webrtcRoomId = `webrtc-${roomType}-${roomId}`;
                logger_1.socketLogger.info({
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
                    const currentParticipants = [];
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error joining WebRTC room',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        socket.on('leave-webrtc-room', (data) => {
            try {
                const { roomId, userId } = data;
                const audioRoomId = `webrtc-audio-${roomId}`;
                const videoRoomId = `webrtc-video-${roomId}`;
                logger_1.socketLogger.info({
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error leaving WebRTC room',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // WebRTC Signaling
        socket.on('webrtc-offer', (data) => {
            try {
                const { roomId, offer, targetUserId } = data;
                logger_1.socketLogger.info({
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling WebRTC offer',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        socket.on('webrtc-answer', (data) => {
            try {
                const { roomId, answer, targetUserId } = data;
                logger_1.socketLogger.info({
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
            }
            catch (error) {
                logger_1.socketLogger.error({
                    message: 'Error handling WebRTC answer',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        socket.on('webrtc-ice-candidate', (data) => {
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
            }
            catch (error) {
                logger_1.socketLogger.error({
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
            logger_1.socketLogger.info({
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
                    io.to(roomId).emit(constants_1.SocketEvents.USER_LEFT, {
                        userId,
                        email,
                        socketId: socket.id,
                        timestamp: new Date(),
                    });
                    // Send removeCursor event for cursor cleanup (following best practices)
                    io.to(roomId).emit('removeCursor', userId);
                    // Log leaving each room
                    logger_1.socketLogger.debug({
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
exports.configureSocket = configureSocket;
//# sourceMappingURL=index.js.map