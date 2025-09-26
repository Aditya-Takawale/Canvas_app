import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

const MinimalCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  // ONE TIME INIT - NO DEPENDENCIES
  useEffect(() => {
    console.log('📍 MinimalCanvas: ONE-TIME INIT');
    
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width: 1200,
        height: 800,
        backgroundColor: '#ffffff',
        isDrawingMode: true,
      });
      
      const canvas = fabricCanvasRef.current;
      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = 5;
      
      // Monitor canvas clear
      const originalClear = canvas.clear;
      canvas.clear = function(...args) {
        console.error('🚨 MinimalCanvas: CANVAS.CLEAR() CALLED!', new Error().stack);
        return originalClear.apply(this, args);
      };
      
      canvas.on('path:created', () => {
        console.log('✏️ MinimalCanvas: Path created');
      });
      
      console.log('✅ MinimalCanvas: Canvas initialized');
    }
    
    // NO CLEANUP - let it persist forever
  }, []); // EMPTY dependency array
  
  // Object count monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (fabricCanvasRef.current) {
        const count = fabricCanvasRef.current.getObjects().length;
        console.log(`📊 MinimalCanvas: Objects count: ${count}`);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="w-full h-full flex flex-col bg-gray-100">
      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-bold">Minimal Canvas Test - Draw with Pencil</h1>
        <p className="text-sm text-gray-600">This canvas has ZERO dependencies that could cause re-renders</p>
      </div>
      
      <div className="flex-1 bg-white flex items-center justify-center p-4">
        <div className="border border-gray-300 shadow-sm">
          <canvas 
            ref={canvasRef} 
            className="bg-white"
            style={{ width: '1200px', height: '800px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default MinimalCanvas;