import React, { useEffect, useRef, useState } from 'react';
import { useRealTimeCollaboration, CursorOverlay, ConnectionStatus } from './RealTimeCollaboration';

interface CollaborativeCanvasProps {
  children: React.ReactNode;
  roomId?: string;
  onCursorMove?: (x: number, y: number) => void;
  onDrawingEvent?: (eventData: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CollaborativeCanvas: React.FC<CollaborativeCanvasProps> = ({
  children,
  roomId = 'default-room',
  onCursorMove,
  onDrawingEvent,
  className,
  style
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 });
  const throttleRef = useRef<NodeJS.Timeout>();

  const {
    isConnected,
    userId,
    cursors,
    sendCursorMove,
    sendDrawingEvent,
    joinRoom,
    error
  } = useRealTimeCollaboration();

  // Join room when connected
  useEffect(() => {
    if (isConnected && roomId) {
      joinRoom(roomId);
    }
  }, [isConnected, roomId, joinRoom]);

  // Handle mouse movement with throttling for performance
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setLocalCursor({ x, y });
    
    // Throttle cursor updates to avoid spam
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }
    
    throttleRef.current = setTimeout(() => {
      sendCursorMove(x, y);
      onCursorMove?.(x, y);
    }, 50); // 20 FPS for cursor updates
  };

  // Handle mouse leave to hide cursor
  const handleMouseLeave = () => {
    // Send cursor position outside bounds to hide it
    sendCursorMove(-1, -1);
  };

  // Handle drawing events (you can extend this based on your canvas implementation)
  const handleDrawingEvent = (eventData: any) => {
    sendDrawingEvent(eventData);
    onDrawingEvent?.(eventData);
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...style
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Connection Status */}
      <ConnectionStatus
        isConnected={isConnected}
        error={error}
        userId={userId}
      />

      {/* Main Canvas Content */}
      <div style={{ width: '100%', height: '100%' }}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // Pass drawing event handler to canvas components
            return React.cloneElement(child, {
              onDrawingEvent: handleDrawingEvent,
              ...child.props
            });
          }
          return child;
        })}
      </div>

      {/* Cursor Overlay */}
      <CursorOverlay
        cursors={cursors}
        containerRef={containerRef}
        userId={userId}
      />

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          pointerEvents: 'none'
        }}>
          <div>Room: {roomId}</div>
          <div>Cursors: {cursors.size}</div>
          <div>Local: ({localCursor.x}, {localCursor.y})</div>
          <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
        </div>
      )}
    </div>
  );
};

// Example usage component for integration
export const ExampleCanvasWithCollaboration: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Initialize your canvas drawing here
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, []);

  const handleDrawingEvent = (eventData: any) => {
    console.log('Drawing event:', eventData);
    // Handle collaborative drawing events here
  };

  return (
    <CollaborativeCanvas
      roomId="example-room"
      onDrawingEvent={handleDrawingEvent}
      style={{
        width: '800px',
        height: '600px',
        border: '1px solid #ccc',
        borderRadius: '8px'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />
    </CollaborativeCanvas>
  );
};