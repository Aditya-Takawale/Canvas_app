import React, { useEffect, useRef, useCallback } from 'react';
import { CursorPosition, SimulatedUser } from '../types/multiUser';

interface SimpleCursorOverlayProps {
  users: SimulatedUser[];
  cursorPositions: Record<string, CursorPosition>;
  showCursors: boolean;
  containerRef: React.RefObject<HTMLElement>;
  onCursorMove?: (position: CursorPosition) => void;
}

/**
 * A simplified cursor overlay component that displays all user cursors
 * without user switching functionality
 */
const SimpleCursorOverlay: React.FC<SimpleCursorOverlayProps> = ({
  users,
  cursorPositions,
  showCursors,
  containerRef,
  onCursorMove
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const trailsRef = useRef<Record<string, { x: number; y: number; timestamp: number; opacity: number }[]>>({});
  const animationFrameRef = useRef<number>();

  // Update cursor trails
  const updateTrails = useCallback(() => {
    const now = Date.now();
    
    // Update trails for each user
    Object.keys(trailsRef.current).forEach(userId => {
      trailsRef.current[userId] = trailsRef.current[userId]
        .map(trail => ({
          ...trail,
          opacity: Math.max(0, trail.opacity - 0.02) // Fade out
        }))
        .filter(trail => trail.opacity > 0 && (now - trail.timestamp) < 2000); // Remove old trails
    });

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(updateTrails);
  }, []);

  // Start trail animation
  useEffect(() => {
    updateTrails();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateTrails]);

  // Add trail point for cursor movement
  const addTrailPoint = useCallback((userId: string, x: number, y: number) => {
    if (!trailsRef.current[userId]) {
      trailsRef.current[userId] = [];
    }
    
    trailsRef.current[userId].push({
      x,
      y,
      timestamp: Date.now(),
      opacity: 1.0
    });

    // Limit trail length
    if (trailsRef.current[userId].length > 20) {
      trailsRef.current[userId].shift();
    }
  }, []);

  // Handle mouse movement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the current user (the one that is active)
    const currentUser = users.find(u => u.isActive);
    if (!currentUser) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const position: CursorPosition = {
        x,
        y,
        timestamp: new Date(),
        userId: currentUser.id
      };

      // Add trail point
      addTrailPoint(currentUser.id, x, y);

      // Notify parent component
      onCursorMove?.(position);
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [containerRef, users, addTrailPoint, onCursorMove]);

  // Render cursor component
  const renderCursor = useCallback((user: SimulatedUser, position: CursorPosition) => {
    if (!showCursors) return null;
    
    const trails = trailsRef.current[user.id] || [];

    // Create a timestamp to force cursor to stay visible
    const now = Date.now();
    const isRecent = now - new Date(position.timestamp).getTime() < 60000; // Consider active if updated in last minute
    const opacity = isRecent ? 1 : 0.7; // Slightly fade out inactive cursors

    return (
      <div key={user.id} className="absolute pointer-events-none" style={{ zIndex: 9999 }}>
        {/* Cursor trails */}
        {trails.map((trail, index) => (
          <div
            key={`${user.id}-trail-${index}`}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: trail.x - 4,
              top: trail.y - 4,
              backgroundColor: user.color,
              opacity: trail.opacity * 0.3,
              transform: `scale(${trail.opacity})`,
              transition: 'opacity 0.1s ease'
            }}
          />
        ))}

        {/* Main cursor - never disappear */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
          style={{
            left: position.x,
            top: position.y,
            filter: `drop-shadow(0 2px 4px ${user.color}40)`,
            zIndex: 9999, // Ensure cursor is always on top
            opacity: opacity
          }}
        >
          {/* Cursor icon */}
          <div 
            className="text-2xl"
            style={{ 
              color: user.color,
              textShadow: `0 0 8px ${user.color}80`
            }}
          >
            {user.cursorIcon}
          </div>

          {/* User label */}
          <div
            className="mt-6 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap transform"
            style={{
              backgroundColor: user.color,
              boxShadow: `0 2px 8px ${user.color}40`
            }}
          >
            {user.name}
            {user.isActive && (
              <span className="ml-1 inline-block w-2 h-2 bg-white rounded-full animate-ping" />
            )}
          </div>
        </div>
      </div>
    );
  }, [showCursors]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-40"
      style={{ overflow: 'hidden' }}
    >
      {/* Render all user cursors */}
      {users.map(user => {
        const position = cursorPositions[user.id];
        return position ? renderCursor(user, position) : null;
      })}

      {/* Cursor visibility status indicator */}
      {!showCursors && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
          <div>👥 Cursors hidden</div>
          <div className="text-xs opacity-75">Press C to show</div>
        </div>
      )}
    </div>
  );
};

export default SimpleCursorOverlay;