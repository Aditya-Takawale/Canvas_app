import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch } from '../hooks/redux';
import { addActiveUser, removeActiveUser, setActiveUsers } from '../store/slices/canvasSlice';

// Helper function to convert socket userId to numeric ID consistently
function socketIdToNumericId(socketId: string): number {
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) {
    const char = socketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

interface CursorData {
  x: number;
  y: number;
  userId: string;
  username?: string;
  color: string;
  timestamp?: number;
}

interface CollaborationHookReturn {
  isConnected: boolean;
  userId: string | null;
  cursors: Map<string, CursorData>;
  sendCursorMove: (x: number, y: number, username?: string) => void;
  sendDrawingEvent: (eventData: any) => void;
  joinRoom: (roomId: string, username?: string) => void;
  error: string | null;
}

export const useRealTimeCollaboration = (
  serverUrl: string = 'ws://localhost:8081'
): CollaborationHookReturn => {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cursors, setCursors] = useState(new Map<string, CursorData>());
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const currentRoomRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    try {
      console.log('🔌 Connecting to collaboration server...');
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to collaboration server');
        setIsConnected(true);
        setError(null);
        
        // Rejoin room if we were in one
        if (currentRoomRef.current) {
          ws.send(JSON.stringify({
            type: 'JOIN_ROOM',
            roomId: currentRoomRef.current
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 Disconnected from collaboration server');
        setIsConnected(false);
        wsRef.current = null;
        
        // Auto-reconnect after 3 seconds if it wasn't a clean close
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
      };

    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Failed to connect to server');
    }
  }, [serverUrl]);

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'USER_INIT':
        setUserId(message.userId);
        break;

      case 'ROOM_STATE':
        // Initialize room with existing cursors and users
        const roomCursors = new Map<string, CursorData>();
        const activeUsers: any[] = [];
        
        // First, add all users from the users array (this is the authoritative list)
        if (message.users && Array.isArray(message.users)) {
          message.users.forEach((userInfo: any) => {
            const socketUserId = userInfo.userId;
            const username = userInfo.username;
            const color = userInfo.color || '#999';
            
            // Add to active users for Redux (use consistent hash of socketId)
            activeUsers.push({
              userId: socketIdToNumericId(socketUserId),
              username: username || socketUserId,
              socketId: socketUserId,
              color
            });
            
            // Add cursor if exists
            const cursorData = message.cursors?.[socketUserId];
            if (cursorData) {
              roomCursors.set(socketUserId, {
                x: cursorData.x,
                y: cursorData.y,
                userId: socketUserId,
                username,
                color
              });
            }
          });
        }
        
        setCursors(roomCursors);
        
        // Update Redux store with active users
        dispatch(setActiveUsers(activeUsers));
        console.log('👥 Room state updated with users:', activeUsers.length, activeUsers);
        break;

      case 'CURSOR_UPDATE':
        setCursors(prev => {
          const updated = new Map(prev);
          updated.set(message.userId, {
            x: message.x,
            y: message.y,
            userId: message.userId,
            username: message.username,
            color: message.color,
            timestamp: Date.now()
          });
          return updated;
        });
        break;

      case 'USER_JOINED':
        console.log(`👤 User joined:`, message);
        // Add user to Redux store
        if (message.userId && message.username) {
          dispatch(addActiveUser({
            userId: socketIdToNumericId(message.userId),
            username: message.username,
            socketId: message.userId,
            color: message.color || '#999'
          }));
        }
        break;

      case 'USER_LEFT':
        console.log(`👤 User left:`, message.userId);
        setCursors(prev => {
          const updated = new Map(prev);
          updated.delete(message.userId);
          return updated;
        });
        // Remove user from Redux store by socketId
        dispatch(removeActiveUser({ socketId: message.userId }));
        break;

      case 'DRAWING_EVENT':
        // Forward drawing events to the canvas component
        if ((window as any).collabMessageHandler) {
          (window as any).collabMessageHandler(message);
        }
        console.log('Drawing event:', message);
        break;

      case 'PONG':
        // Handle ping/pong for connection health
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  const sendCursorMove = useCallback((x: number, y: number, username?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CURSOR_MOVE',
        x,
        y,
        username
      }));
    }
  }, []);

  const sendDrawingEvent = useCallback((eventData: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DRAWING_EVENT',
        data: eventData
      }));
    }
  }, []);

  const joinRoom = useCallback((roomId: string, username?: string) => {
    currentRoomRef.current = roomId;
    (window as any).currentRoomId = roomId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomId,
        username
      }));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  return {
    isConnected,
    userId,
    cursors,
    sendCursorMove,
    sendDrawingEvent,
    joinRoom,
    error
  };
};

// Cursor Overlay Component
interface CursorOverlayProps {
  cursors: Map<string, CursorData>;
  containerRef: React.RefObject<HTMLElement>;
  userId?: string | null;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
  cursors,
  containerRef,
  userId
}) => {
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        setContainerBounds(containerRef.current.getBoundingClientRect());
      }
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [containerRef]);

  if (!containerBounds) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: containerBounds.width,
        height: containerBounds.height,
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      {Array.from(cursors.entries()).map(([cursorUserId, cursor]) => {
        // Don't show our own cursor
        if (cursorUserId === userId) return null;

        return (
          <div
            key={cursorUserId}
            style={{
              position: 'absolute',
              left: cursor.x - 12,
              top: cursor.y - 12,
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)',
              transition: 'all 0.1s ease-out'
            }}
          >
            {/* Cursor pointer */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
            >
              <path
                d="M5 3l14 9-6 0-2 6z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            
            {/* User name label */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '12px',
                backgroundColor: cursor.color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {cursor.username || cursorUserId.replace('user_', '')}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Connection Status Component
interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
  userId: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  error,
  userId
}) => {
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: '#fee',
        color: '#c44',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 2000
      }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: isConnected ? '#efe' : '#ffe',
      color: isConnected ? '#484' : '#884',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 2000
    }}>
      {isConnected ? (
        <>✅ Connected {userId && `(${userId.replace('user_', '')})`}</>
      ) : (
        <>🔄 Connecting...</>
      )}
    </div>
  );
};