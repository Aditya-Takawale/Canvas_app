import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { addOperation, addActiveUser, removeActiveUser, updateUserCursor, updateActiveUserColor, setActiveUsers } from '../store/slices/canvasSlice';
import { AppDispatch } from '../store';
import { DrawingOperation } from '../interfaces/room';
import { SocketEvents } from '../utils/constants';
import { BinaryStrokeEncoder, BinaryCursorEncoder, BinaryProtocolStats } from '../utils/binaryProtocol';

interface SocketParams {
  url: string;
  roomId: number;
  userId: number;
  token: string;
  dispatch: AppDispatch;
}

// Define interfaces for socket events
interface UserJoinedData {
  userId: number;
  username?: string;
  socketId: string;
  timestamp: Date;
}

interface UserLeftData {
  userId: number;
  username?: string;
  socketId: string;
  timestamp: Date;
}

interface CursorPositionData {
  userId: number;
  x: number;
  y: number;
  roomId?: string;
  ts?: number;
  username?: string;
  // legacy field support
  socketId?: string;
}

interface CanvasSocket {
  socket: ReturnType<typeof io> | null;
  connect: () => void;
  disconnect: () => void;
  emitDrawingOperation: (operation: Omit<DrawingOperation, 'id' | 'createdAt' | 'canvasId' | 'userId'>) => void;
  emitCursorPosition: (position: { x: number; y: number }) => void;
  isConnected: () => boolean;
  emitChatMessage?: (data: { message: string; roomId: number; userId: number; username: string; timestamp: string }) => void;
  emitInstantDrawing: (data: { drawingData: any; action: string }) => void;
  emitColorUpdate: (color: string) => void;
  // Progressive stroke streaming
  emitStrokeBegin: (data: { strokeId: string; color: string; size: number; tool: string; start: { x: number; y: number } }) => void;
  emitStrokePoints: (data: { strokeId: string; points: Array<{ x: number; y: number; dt?: number }>; seq?: number }) => void;
  emitStrokeEnd: (data: { strokeId: string; final?: { x: number; y: number }; totalPoints?: number; pathData?: any; color?: string; size?: number; tool?: string }) => void;
  emitStrokeCancel: (data: { strokeId: string; reason?: string }) => void;
}

export const createCanvasSocket = ({
  url,
  roomId,
  userId,
  token,
  dispatch
}: SocketParams): CanvasSocket => {
  let socket: ReturnType<typeof io> | null = null;

  const connect = (): void => {
    if (socket) {
      console.log('🔌 Socket: Disconnecting previous socket before new connection');
      socket.disconnect();
      socket = null;
    }

    console.log('🔌 Socket: Creating new connection to room:', roomId);

    // Connect to the socket server with authentication token and room ID
    socket = io(url, {
      auth: { token },
      query: {
        roomId: roomId.toString(),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Set up socket event listeners
    socket.on('connect', () => {
      console.log('🔌 Socket: Connected to server, joining room:', roomId);
      
      // Join the room after successful connection
      socket?.emit(SocketEvents.JOIN_ROOM, roomId.toString());
    });

    socket.on('connect_error', (err: Error) => {
      console.error('❌ Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from canvas socket:', reason);
    });

    socket.on(SocketEvents.USER_JOINED, (data: UserJoinedData) => {
      dispatch(addActiveUser({
        userId: data.userId,
        username: data.username || `User ${data.userId}`,
        socketId: data.socketId
      }));
    });

    socket.on(SocketEvents.USER_LEFT, (data: UserLeftData) => {
      dispatch(removeActiveUser({ socketId: data.socketId }));
    });

    // Handle room users list (sent when joining room or when users change)
    socket.on(SocketEvents.ROOM_USERS, (data: { users: any[], roomId: string }) => {
      console.log('👥 ROOM_USERS received:', data);
      if (data && Array.isArray(data.users)) {
        const users = data.users.map((user: any) => ({
          userId: user.userId,
          username: user.username || user.email?.split('@')[0] || `User ${user.userId}`,
          socketId: user.socketId,
          color: `hsl(${(user.userId * 137.508) % 360}, 70%, 50%)` // Consistent color per user
        }));
        dispatch(setActiveUsers(users));
        console.log('✅ Set active users from ROOM_USERS:', users);
      }
    });

    socket.on(SocketEvents.DRAWING_EVENT, (operation: DrawingOperation) => {
      // Add console.log for debugging as suggested
      console.log('📨 Received DRAWING_EVENT from server:', {
        action: operation.action,
        objectType: operation.objectType,
        userId: operation.userId,
        currentUserId: userId,
        timestamp: new Date().toISOString()
      });
      
      // Process all operations from other users (server only sends operations from other users now)
      // Deduplicate: if path operation has strokeId that already exists on canvas, ignore.
      try {
        if (operation.objectType === 'path' && operation.objectData) {
          const data = typeof operation.objectData === 'string' ? JSON.parse(operation.objectData) : operation.objectData;
          const strokeId = data?.strokeId;
          if (strokeId) {
            const canvasEl: any = (window as any).__FABRIC_CANVAS__;
            if (canvasEl && typeof canvasEl.getObjects === 'function') {
              const exists = canvasEl.getObjects().some((o: any) => o.strokeId === strokeId || o.strokeId === data?.strokeId || o?.data?.strokeId === strokeId);
              if (exists) {
                console.log('🛑 Skipping legacy DRAWING_EVENT duplicate for strokeId', strokeId);
                return;
              }
            }
          }
        }
      } catch {}
      dispatch(addOperation({
        id: operation.id || Date.now(),
        objectType: operation.objectType,
        objectData: operation.objectData,
        action: operation.action,
        createdAt: operation.createdAt || new Date().toISOString(),
        canvasId: operation.canvasId || 0,
        userId: operation.userId
      }));
      
      console.log('Added operation to Redux store:', operation.objectType, operation.action);
    });

    // Handle instant drawing events (like chat - direct canvas manipulation)
    socket.on('INSTANT_DRAWING', (data: { drawingData: any; action: string; userId: number; email: string; timestamp: string }) => {
      console.log('⚡ Received INSTANT_DRAWING from server:', {
        action: data.action,
        userId: data.userId,
        currentUserId: userId,
        timestamp: data.timestamp
      });
      
      // Trigger custom event for canvas to handle instantly
      window.dispatchEvent(new CustomEvent('instantDrawing', {
        detail: {
          drawingData: data.drawingData,
          action: data.action,
          userId: data.userId,
          email: data.email,
          timestamp: data.timestamp
        }
      }));
      
      console.log('⚡ Instant drawing event dispatched to canvas');
    });

    socket.on(SocketEvents.CURSOR_MOVE, (data: CursorPositionData) => {
      if (data.userId === userId) return;
      // Ensure active user exists
      const ensuredName = data.username || `User ${data.userId}`;
      dispatch(addActiveUser({
        userId: data.userId,
        username: ensuredName,
        socketId: data.socketId || `virtual-${data.userId}`
      }));
      dispatch(updateUserCursor({
        userId: data.userId,
        cursorPosition: { x: data.x, y: data.y }
      }));
    });

    socket.on(SocketEvents.USER_COLOR_UPDATE as any, (data: { userId: number; color: string }) => {
      if (!data || typeof data.userId === 'undefined' || !data.color) return;
      dispatch(updateActiveUserColor({ userId: data.userId, color: data.color }));
    });

    // Progressive stroke event listeners (rebroadcast to window for canvas integration layer)
    const forward = (eventName: string, detail: any) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    };
  socket.on(SocketEvents.STROKE_BEGIN, (data: any) => forward('stroke_begin', data));
  socket.on(SocketEvents.STROKE_POINT, (data: any) => forward('stroke_point', data));
  socket.on(SocketEvents.STROKE_END, (data: any) => forward('stroke_end', data));
  socket.on(SocketEvents.STROKE_CANCEL, (data: any) => forward('stroke_cancel', data));
    
    // Handle server errors
    socket.on(SocketEvents.ERROR, (error: { message: string }) => {
      console.error('Socket server error:', error.message);
    });
  };

  const disconnect = (): void => {
    if (socket) {
      console.log('🔌 Socket: Leaving room before disconnect:', roomId);
      // Leave the room before disconnecting
      socket.emit(SocketEvents.LEAVE_ROOM, roomId.toString());
      
      // Add a small delay to ensure the leave room event is processed
      setTimeout(() => {
        socket?.disconnect();
        socket = null;
        console.log('🔌 Socket: Disconnected from room:', roomId);
      }, 50);
    }
  };

  const emitDrawingOperation = (operation: Omit<DrawingOperation, 'id' | 'createdAt' | 'canvasId' | 'userId'>): void => {
    console.log('🔌 Socket emitDrawingOperation called:', { 
      operation, 
      socketConnected: socket?.connected, 
      hasSocket: !!socket,
      roomId,
      eventName: SocketEvents.DRAWING_EVENT 
    });
    
    if (socket && socket.connected) {
      const payload = {
        ...operation,
        roomId,
      };
      console.log('✅ [FRONTEND] Emitting DRAWING_EVENT to server...', {
        eventName: SocketEvents.DRAWING_EVENT,
        payload,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      socket.emit(SocketEvents.DRAWING_EVENT, payload);
      console.log('📤 [FRONTEND] Event emitted successfully');
    } else {
      console.error('❌ Socket not connected or not available!', { 
        hasSocket: !!socket, 
        connected: socket?.connected 
      });
    }
  };

  const emitCursorPosition = (position: { x: number; y: number }): void => {
    if (socket && socket.connected) {
      // Use binary encoding for high-frequency cursor updates (90% size reduction)
      const binaryData = BinaryCursorEncoder.encodeCursor(userId!, position.x, position.y);
      socket.emit('CURSOR_MOVE_BINARY', { roomId, data: binaryData });
    }
  };

  const isConnected = (): boolean => {
    return socket !== null && socket.connected;
  };

  // Add chat message emitter
  const emitChatMessage = (data: { message: string; roomId: number; userId: number; username: string; timestamp: string }): void => {
    if (socket && socket.connected) {
      console.log('🗨️ Emitting chat message:', data);
      socket.emit(SocketEvents.CHAT_MESSAGE, data);
    } else {
      console.error('❌ Cannot send chat message: Socket not connected', { 
        hasSocket: !!socket,
        connected: socket?.connected,
        data
      });
    }
  };

  // Add instant drawing emitter (like chat)
  const emitInstantDrawing = (data: { drawingData: any; action: string }): void => {
    if (socket && socket.connected) {
      console.log('⚡ [FRONTEND] Emitting instant drawing:', data);
      socket.emit('INSTANT_DRAWING', {
        roomId,
        drawingData: data.drawingData,
        action: data.action
      });
      console.log('⚡ [FRONTEND] Instant drawing emitted successfully');
    } else {
      console.error('❌ Cannot send instant drawing: Socket not connected', { 
        hasSocket: !!socket,
        connected: socket?.connected
      });
    }
  };

  const emitColorUpdate = (color: string): void => {
    if (socket && socket.connected) {
      socket.emit('user_color_update', { roomId, color });
    }
  };

  // --- Stroke streaming emitters ---
  const emitStrokeBegin = (data: { strokeId: string; color: string; size: number; tool: string; start: { x: number; y: number } }) => {
    if (socket && socket.connected) {
      // Use binary encoding for high-frequency stroke data
      const binaryData = BinaryStrokeEncoder.encodeStroke({
        strokeId: data.strokeId,
        points: [{ x: data.start.x, y: data.start.y }],
        color: data.color,
        size: data.size,
        tool: data.tool
      });
      
      // Performance comparison
      const jsonSize = JSON.stringify({ roomId, ...data, ts: Date.now() }).length;
      BinaryProtocolStats.recordComparison(jsonSize, binaryData.byteLength);
      
      socket.emit('STROKE_BEGIN_BINARY', { roomId, data: binaryData, ts: Date.now() });
    }
  };
  const emitStrokePoints = (data: { strokeId: string; points: Array<{ x: number; y: number; dt?: number }>; seq?: number }) => {
    if (socket && socket.connected && data.points.length) {
      // Compress points to reduce bandwidth further
      const compressedPoints = BinaryStrokeEncoder.compressPoints(data.points);
      
      if (compressedPoints.length > 0) {
        const binaryData = BinaryStrokeEncoder.encodeStroke({
          strokeId: data.strokeId,
          points: compressedPoints,
          color: '#000', // Minimal data for points
          size: 0,
          tool: ''
        });
        
        socket.emit('STROKE_POINTS_BINARY', { roomId, data: binaryData, seq: data.seq, ts: Date.now() });
      }
    }
  };
  const emitStrokeEnd = (data: { strokeId: string; final?: { x: number; y: number }; totalPoints?: number; pathData?: any; color?: string; size?: number; tool?: string }) => {
    if (socket && socket.connected) {
      socket.emit(SocketEvents.STROKE_END, { roomId, ...data, ts: Date.now() });
    }
  };
  const emitStrokeCancel = (data: { strokeId: string; reason?: string }) => {
    if (socket && socket.connected) {
      socket.emit(SocketEvents.STROKE_CANCEL, { roomId, ...data, ts: Date.now() });
    }
  };

  return {
    socket,
    connect,
    disconnect,
    emitDrawingOperation,
    emitCursorPosition,
    emitChatMessage,
    emitInstantDrawing, // Add instant drawing like chat
    emitColorUpdate,
    emitStrokeBegin,
    emitStrokePoints,
    emitStrokeEnd,
    emitStrokeCancel,
    isConnected
  };
};