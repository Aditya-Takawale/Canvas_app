import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface SimpleCursorSystemProps {
  containerRef: React.RefObject<HTMLDivElement>;
  roomId?: number;
}

interface CursorData {
  [userId: string]: CursorPosition;
}

const SimpleCursorSystem: React.FC<SimpleCursorSystemProps> = ({ containerRef, roomId = 1 }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<CursorData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  // Utility function to generate consistent colors
  const stringToColor = useCallback((str: string): string => {
    if (!str) return '#3B82F6';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }, []);

  // Handle WebSocket messages
  const handleMessage = useCallback((message: any) => {
    switch(message.type) {
      case 'USER_ID':
        setUserId(message.userId);
        console.log('👤 Got user ID:', message.userId);
        break;

      case 'CURSORS_UPDATE':
        setCursors(message.cursors);
        setUserCount(Object.keys(message.cursors).length);
        break;

      case 'PONG':
        // Heartbeat response
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8081');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to cursor server');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('❌ Disconnected from cursor server');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 2 seconds
        setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setTimeout(connectWebSocket, 2000);
    }
  }, [handleMessage]);

  const sendCursorUpdate = useCallback((x: number, y: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Throttle cursor updates to avoid overwhelming the server
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
      
      throttleRef.current = setTimeout(() => {
        wsRef.current?.send(JSON.stringify({
          type: 'CURSOR_MOVE',
          x: x,
          y: y
        }));
      }, 16); // ~60fps
    }
  }, []);

  // Mouse event handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      sendCursorUpdate(x, y);
    };

    const handleMouseLeave = () => {
      sendCursorUpdate(-100, -100);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, sendCursorUpdate]);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
      if (wsRef.current) {
        sendCursorUpdate(-100, -100);
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, sendCursorUpdate]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);

    return () => clearInterval(heartbeat);
  }, []);

  // Render cursors
  return (
    <>
      {/* Connection status */}
      <div className="fixed top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg z-50 text-sm">
        <div className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div className="text-gray-600">
          {userCount} user{userCount !== 1 ? 's' : ''} online
        </div>
        {userId && (
          <div className="text-gray-500 text-xs mt-1 font-mono">
            ID: {userId.substring(5, 11)}
          </div>
        )}
      </div>

      {/* Render other users' cursors */}
      {Object.entries(cursors).map(([cursorUserId, cursor]) => {
        // Don't render our own cursor
        if (cursorUserId === userId) return null;
        
        // Don't render off-screen cursors
        if (cursor.x < 0 || cursor.y < 0) return null;

        const color = stringToColor(cursorUserId);
        
        return (
          <div
            key={cursorUserId}
            className="absolute pointer-events-none z-40 transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              color: color
            }}
          >
            {/* Cursor triangle */}
            <div 
              style={{
                width: 0,
                height: 0,
                borderLeft: `10px solid ${color}`,
                borderRight: '0px solid transparent',
                borderBottom: '15px solid transparent',
                borderTop: '5px solid transparent'
              }}
            />
            
            {/* User label */}
            <div 
              className="absolute left-4 top-0 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
              style={{ fontSize: '11px' }}
            >
              {cursorUserId.substring(5, 11)}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default SimpleCursorSystem;