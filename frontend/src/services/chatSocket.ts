import io, { Socket } from 'socket.io-client';
import { SocketEvents } from '../utils/constants';

interface ChatSocketParams {
  url: string;
  roomId: number;
  userId: number;
  token: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onConnectError?: (error: Error) => void;
  onChatMessage?: (message: any) => void;
  onUserJoined?: (userData: any) => void;
  onUserLeft?: (userData: any) => void;
}

interface ChatSocket {
  socket: ReturnType<typeof io> | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (messageData: { message: string }) => void;
  isConnected: () => boolean;
}

export const createChatSocket = (params: ChatSocketParams): ChatSocket => {
  const { url, roomId, userId, token, onConnect, onDisconnect, onConnectError, onChatMessage, onUserJoined, onUserLeft } = params;
  
  // Create a separate socket instance specifically for chat
  let socket: ReturnType<typeof io> | null = null;
  
  const connect = (): void => {
    if (socket) {
      console.log('Chat socket already exists, disconnecting first');
      socket.disconnect();
    }
    
    console.log('🗨️ Creating new chat socket connection:', {
      url,
      roomId,
      userId
    });
    
    // Connect to the socket server with authentication token and room ID
    socket = io(url, {
      auth: { token },
      query: {
        roomId: roomId.toString(),
        feature: 'chat' // Indicate this is a chat-specific socket
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'] // Try WebSocket first, then polling
    });
    
    // Set up event listeners
    socket.on('connect', () => {
      console.log('🗨️ Chat socket connected:', socket?.id);
      
      // Join the room after successful connection
      socket?.emit(SocketEvents.JOIN_ROOM, roomId.toString());
      
      // Call the onConnect callback if provided
      if (onConnect) onConnect();
    });
    
    socket.on('connect_error', (error: Error) => {
      console.error('🗨️ Chat socket connection error:', error.message);
      
      // Call the onConnectError callback if provided
      if (onConnectError) onConnectError(error);
    });
    
    socket.on('disconnect', (reason: string) => {
      console.log('🗨️ Chat socket disconnected:', reason);
      
      // Call the onDisconnect callback if provided
      if (onDisconnect) onDisconnect(reason);
    });
    
    // Set up chat-specific event listeners
    if (onChatMessage) {
      socket.on(SocketEvents.CHAT_MESSAGE, onChatMessage);
    }
    
    if (onUserJoined) {
      socket.on(SocketEvents.USER_JOINED, onUserJoined);
    }
    
    if (onUserLeft) {
      socket.on(SocketEvents.USER_LEFT, onUserLeft);
    }
    
    // Debug socket events
    console.log('🗨️ Chat socket setup complete, listening for events');
  };
  
  const disconnect = (): void => {
    if (socket) {
      // Leave the room before disconnecting
      socket.emit(SocketEvents.LEAVE_ROOM, roomId.toString());
      socket.disconnect();
      socket = null;
    }
  };
  
  const sendMessage = (messageData: { message: string }): void => {
    if (!socket || !socket.connected) {
      console.error('Cannot send chat message: Socket not connected');
      return;
    }
    
    const chatMessage = {
      userId,
      roomId,
      message: messageData.message.trim(),
      timestamp: new Date().toISOString()
    };
    
    console.log('🗨️ Sending chat message:', chatMessage);
    socket.emit(SocketEvents.CHAT_MESSAGE, chatMessage);
  };
  
  const isConnected = (): boolean => {
    return socket !== null && socket.connected;
  };
  
  return {
    get socket() { return socket; },
    connect,
    disconnect,
    sendMessage,
    isConnected
  };
};