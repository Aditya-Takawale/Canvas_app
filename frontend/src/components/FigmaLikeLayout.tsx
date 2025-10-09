import React, { useState, useRef } from 'react';
// MultiUserFigmaCanvas deprecated: unified into CursorsOnlyFigmaCanvas for simplicity
// import MultiUserFigmaCanvas from './MultiUserFigmaCanvas';
import CursorsOnlyFigmaCanvas from './CursorsOnlyFigmaCanvas';
import CollaborativeFigmaCanvas from './CollaborativeFigmaCanvas';
import DrawingToolbar from './DrawingToolbar';
import PropertiesPanel from './PropertiesPanel';

interface FigmaLikeLayoutProps {
  roomId: number;
  readOnly?: boolean;
  cursorsModeOnly?: boolean;
  useCollaboration?: boolean; // New prop to enable real-time collaboration
}

/**
 * FigmaLikeLayout wraps the canvas component with sidebars to create a complete Figma-like interface
 * with user visualization capabilities. Can use either:
 * 1. CollaborativeFigmaCanvas (new real-time WebSocket collaboration)
 * 2. CursorsOnlyFigmaCanvas (legacy Socket.IO based)
 */
const FigmaLikeLayout: React.FC<FigmaLikeLayoutProps> = ({
  roomId,
  readOnly = false,
  cursorsModeOnly = true, // Default to cursor-only mode
  useCollaboration = true // Default to new collaboration system
}) => {
  // Allow toggling between the two canvas modes
  // Always in cursors-only unified mode
  const [showCursorsOnly] = useState(true);
  
  // Shared ref to prevent multiple components from loading simultaneously
  const isLoadingRef = useRef(false);
  const lastRoomIdRef = useRef<number | null>(null);

  // Toggle canvas mode with loading protection
  const toggleCanvasMode = () => { console.log('ℹ️ Multi-user mode disabled (deprecated)'); };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      {/* Mode toggle button */}
      <div className="w-full bg-blue-50 p-2 flex justify-center border-b border-blue-200 text-xs text-blue-700">
        {useCollaboration ? (
          '🚀 Real-time WebSocket collaboration active'
        ) : (
          'Legacy Socket.IO mode (deprecated)'
        )}
      </div>
      
      {/* Main layout */}
  <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Drawing Tools */}
        <div className="flex-shrink-0">
          <DrawingToolbar />
        </div>
        
        {/* Main Canvas Area - takes all available space */}
  <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {useCollaboration ? (
            <CollaborativeFigmaCanvas 
              key={`collaborative-${roomId}`}
              roomId={roomId}
              readOnly={readOnly}
            />
          ) : (
            <CursorsOnlyFigmaCanvas 
              key={`cursors-${roomId}`}
              roomId={roomId}
              readOnly={readOnly}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FigmaLikeLayout;