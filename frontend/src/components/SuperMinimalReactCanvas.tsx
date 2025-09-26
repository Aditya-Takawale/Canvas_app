import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

interface SuperMinimalReactCanvasProps {
  roomId: number;
  width?: number;
  height?: number;
}

// SUPER MINIMAL React component - but now WITH PROPS like PureMinimalCanvas
const SuperMinimalReactCanvas: React.FC<SuperMinimalReactCanvasProps> = ({ 
  roomId, 
  width = 800, 
  height = 400 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  // ONLY ONCE - no dependencies, no cleanup, no nothing
  useEffect(() => {
    console.log('🔬 SuperMinimal React: Initializing...');
    
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
        isDrawingMode: true,
      });
      
      const canvas = fabricCanvasRef.current;
      
      // Set brush
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = 5;
      }
      
      // Monitor clear
      const originalClear = canvas.clear;
      canvas.clear = function(...args) {
        console.error('🚨 SuperMinimal React: CANVAS.CLEAR() CALLED!', new Error().stack);
        return originalClear.apply(this, args);
      };
      
      // Simple logging
      canvas.on('path:created', () => {
        const count = canvas.getObjects().length;
        console.log(`✏️ SuperMinimal React: Path created, objects: ${count}`);
      });
      
      console.log('✅ SuperMinimal React: Canvas ready');
    }
    
    // NO CLEANUP - let it persist
  }, []); // Empty deps like pure HTML
  
  // NO OTHER useEffects, NO props, NO state changes
  
  return (
    <div className="pure-minimal-canvas w-full h-full flex flex-col bg-gray-100">
      <div className="bg-white border-b border-gray-300 px-4 py-2">
        <h3 className="text-lg font-bold text-red-600">
          🔬 SUPER MINIMAL WITH PURE MINIMAL STYLING
        </h3>
        <p className="text-sm text-gray-600">
          Testing if CSS/DOM structure is causing the canvas clearing issue.
        </p>
      </div>
      
      <div className="flex-1 bg-white flex items-center justify-center p-4">
        <div className="relative border-2 border-red-300 shadow-sm">
          <canvas 
            ref={canvasRef} 
            className="bg-white"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SuperMinimalReactCanvas;