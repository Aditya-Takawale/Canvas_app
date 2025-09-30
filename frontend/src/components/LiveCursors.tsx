import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '../hooks/redux';

interface LiveCursorsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  socketRef: React.RefObject<any>;
}

interface CursorData {
  x: number;
  y: number;
  userId: number;
  username: string;
  color: string;
}

/**
 * LiveCursors component for showing other users' cursors in real-time
 * Similar to Figma's collaborative cursor system
 */
const LiveCursors: React.FC<LiveCursorsProps> = ({ canvasRef, socketRef }) => {
  const cursorsRef = useRef<Map<number, CursorData>>(new Map());
  const { activeUsers } = useAppSelector(state => state.canvas);
  const { user } = useAppSelector(state => state.auth);

  // Generate consistent colors for users
  const getUserColor = (userId: number): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[userId % colors.length];
  };

  // Handle mouse movement for cursor tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !socketRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Emit cursor position via socket
      if (socketRef.current?.isConnected()) {
        socketRef.current.emitCursorPosition({ x, y });
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [canvasRef, socketRef]);

  // Update cursors when active users change
  useEffect(() => {
    const newCursors = new Map<number, CursorData>();
    
    activeUsers.forEach(activeUser => {
      if (activeUser.userId !== user?.id && activeUser.cursorPosition) {
        newCursors.set(activeUser.userId, {
          x: activeUser.cursorPosition.x,
          y: activeUser.cursorPosition.y,
          userId: activeUser.userId,
          username: activeUser.username,
          color: getUserColor(activeUser.userId),
        });
      }
    });

    cursorsRef.current = newCursors;
  }, [activeUsers, user?.id]);

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {Array.from(cursorsRef.current.values()).map((cursor) => (
        <div
          key={cursor.userId}
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-2px, -2px)',
            pointerEvents: 'none',
            zIndex: 1001,
          }}
        >
          {/* Cursor Icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
          >
            <path
              d="M12 2L3 21L9 14L16 12L12 2Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          
          {/* Username Label */}
          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: '2px',
              backgroundColor: cursor.color,
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {cursor.username}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveCursors;