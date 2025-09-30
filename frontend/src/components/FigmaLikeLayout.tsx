import React from 'react';
import FigmaStyleCanvas from './FigmaStyleCanvas';
import DrawingToolbar from './DrawingToolbar';
import PropertiesPanel from './PropertiesPanel';

interface FigmaLikeLayoutProps {
  roomId: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

/**
 * FigmaLikeLayout wraps FigmaStyleCanvas with sidebars to create a complete Figma-like interface
 */
const FigmaLikeLayout: React.FC<FigmaLikeLayoutProps> = ({
  roomId,
  width = 800,
  height = 600,
  readOnly = false
}) => {
  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar - Drawing Tools */}
      <DrawingToolbar />
      
      {/* Main Canvas Area - use existing working FigmaStyleCanvas */}
      <div className="flex-1">
        <FigmaStyleCanvas 
          roomId={roomId}
          width={width}
          height={height}
          readOnly={readOnly}
        />
      </div>
      
      {/* Right Sidebar - Properties Panel */}
      <PropertiesPanel />
    </div>
  );
};

export default FigmaLikeLayout;