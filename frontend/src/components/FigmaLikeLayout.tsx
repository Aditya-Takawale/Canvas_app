import React, { useState, useRef } from 'react';
import MultiUserFigmaCanvas from './MultiUserFigmaCanvas';
import CursorsOnlyFigmaCanvas from './CursorsOnlyFigmaCanvas';
import DrawingToolbar from './DrawingToolbar';
import PropertiesPanel from './PropertiesPanel';

interface FigmaLikeLayoutProps {
  roomId: number;
  readOnly?: boolean;
  cursorsModeOnly?: boolean;
}

/**
 * FigmaLikeLayout wraps the canvas component with sidebars to create a complete Figma-like interface
 * with user visualization capabilities. Can use either:
 * - MultiUserFigmaCanvas: Full multi-user simulation with user switching
 * - CursorsOnlyFigmaCanvas: Only shows cursor positions without user switching
 */
const FigmaLikeLayout: React.FC<FigmaLikeLayoutProps> = ({
  roomId,
  readOnly = false,
  cursorsModeOnly = true // Default to cursor-only mode
}) => {
  // Allow toggling between the two canvas modes
  const [showCursorsOnly, setShowCursorsOnly] = useState(cursorsModeOnly);
  
  // Shared ref to prevent multiple components from loading simultaneously
  const isLoadingRef = useRef(false);
  const lastRoomIdRef = useRef<number | null>(null);

  // Toggle canvas mode with loading protection
  const toggleCanvasMode = () => {
    // Prevent toggling while loading
    if (isLoadingRef.current) {
      console.log('🛑 FigmaLikeLayout: Cannot toggle mode while loading');
      return;
    }
    
    console.log(`🔄 FigmaLikeLayout: Switching to ${showCursorsOnly ? 'Multi-user' : 'Cursors-only'} mode`);
    setShowCursorsOnly(!showCursorsOnly);
    
    // Add small delay to prevent rapid mode switching
    isLoadingRef.current = true;
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Mode toggle button */}
      <div className="w-full bg-blue-50 p-2 flex justify-center border-b border-blue-200">
        <button 
          onClick={toggleCanvasMode}
          className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Switch to {showCursorsOnly ? 'Multi-user Mode' : 'Cursors-only Mode'}
        </button>
      </div>
      
      {/* Main layout */}
      <div className="flex flex-1 overflow-auto min-h-0">
        {/* Left Sidebar - Drawing Tools */}
        <div className="flex-shrink-0">
          <DrawingToolbar />
        </div>
        
        {/* Main Canvas Area - takes all available space */}
        <div className="flex-1 min-w-0 min-h-0">
          {showCursorsOnly ? (
            <CursorsOnlyFigmaCanvas 
              key={`cursors-${roomId}`}
              roomId={roomId}
              readOnly={readOnly}
            />
          ) : (
            <MultiUserFigmaCanvas 
              key={`multiuser-${roomId}`}
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