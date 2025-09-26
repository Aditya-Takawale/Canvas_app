import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

interface PureMinimalCanvasProps {
  roomId: number;
  width?: number;
  height?: number;
}

const PureMinimalCanvas: React.FC<PureMinimalCanvasProps> = ({ 
  roomId, 
  width = 1200, 
  height = 800
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  // PURE MINIMAL INITIALIZATION - NO REDUX, NO SOCKET, NO NOTHING
  useEffect(() => {
    console.log('🎨 PureMinimalCanvas: PURE INIT - NO REDUX, NO SOCKET');
    
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
        isDrawingMode: true,
      });
      
      const canvas = fabricCanvasRef.current;
      
      // Set up basic drawing brush
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = 5;
      }
      
      // Monitor canvas clear 
      const originalClear = canvas.clear;
      canvas.clear = function(...args) {
        console.error('🚨 PureMinimalCanvas: CANVAS.CLEAR() CALLED!', new Error().stack);
        return originalClear.apply(this, args);
      };
      
      // ONLY LOG - NO REDUX, NO SOCKET
      canvas.on('path:created', (e: any) => {
        console.log('✏️ PureMinimalCanvas: Path created - NO DISPATCH, NO SOCKET');
        const count = canvas.getObjects().length;
        console.log(`📊 PureMinimalCanvas: Objects count after path: ${count}`);
      });
      
      // REMOVED object:added handler - this might be causing the issue!
      // canvas.on('object:added', (e: any) => {
      //   console.log('➕ PureMinimalCanvas: Object added');
      //   const count = canvas.getObjects().length;
      //   console.log(`📊 PureMinimalCanvas: Objects count after add: ${count}`);
      // });
      
      console.log('✅ PureMinimalCanvas: Pure canvas initialized - NO EXTERNAL DEPENDENCIES');
    }
  }, []); // EMPTY dependency array

  // REMOVED MONITORING useEffect TO TEST IF IT'S CAUSING THE ISSUE
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (fabricCanvasRef.current) {
  //       const count = fabricCanvasRef.current.getObjects().length;
  //       console.log(`📊 PureMinimalCanvas: Periodic objects count: ${count}`);
  //     }
  //   }, 3000);
  //   
  //   return () => clearInterval(interval);
  // }, []);
  
  return (
    <div className="pure-minimal-canvas w-full h-full flex flex-col bg-gray-100">
      <div className="bg-white border-b border-gray-300 px-4 py-2">
        <h3 className="text-lg font-bold text-red-600">
          🔬 PURE MINIMAL CANVAS - NO REDUX, NO SOCKET, NO DEPENDENCIES
        </h3>
        <p className="text-sm text-gray-600">
          This canvas has ZERO external dependencies. If drawings disappear here, 
          it's a Fabric.js issue. If they persist here but disappear in StableCanvas, 
          it's Redux/Socket interference.
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

export default PureMinimalCanvas;