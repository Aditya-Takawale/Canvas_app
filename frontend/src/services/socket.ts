import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { addOperation, addActiveUser, removeActiveUser, updateUserCursor } from '../store/slices/canvasSlice';
import { AppDispatch } from '../store';
import { DrawingOperation } from '../interfaces/room';
import { SocketEvents } from '../utils/constants';

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
  username: string;
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
  socketId: string;
  x: number;
  y: number;
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
        username: data.username,
        socketId: data.socketId
      }));
    });

    socket.on(SocketEvents.USER_LEFT, (data: UserLeftData) => {
      dispatch(removeActiveUser({ socketId: data.socketId }));
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
      // Only update cursor positions from other users
      if (data.userId !== userId) {
        dispatch(updateUserCursor({
          userId: data.userId,
          cursorPosition: { x: data.x, y: data.y }
        }));
      }
    });
    
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
      socket.emit(SocketEvents.CURSOR_MOVE, {
        x: position.x,
        y: position.y,
        roomId,
      });
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

  return {
    socket,
    connect,
    disconnect,
    emitDrawingOperation,
    emitCursorPosition,
    emitChatMessage,
    emitInstantDrawing, // Add instant drawing like chat
    isConnected
  };
};