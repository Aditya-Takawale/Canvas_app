import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import SimpleCursorSystem from './SimpleCursorSystem';

interface SimpleCanvasProps {
  roomId?: number;
  width?: number;
  height?: number;
}

const SimpleCanvas: React.FC<SimpleCanvasProps> = ({ 
  roomId = 1, 
  width = 800, 
  height = 600 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create Fabric.js canvas
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    // Enable drawing mode
    fabricCanvas.isDrawingMode = true;
    fabricCanvas.freeDrawingBrush.width = 2;
    fabricCanvas.freeDrawingBrush.color = '#2563eb';

    fabricCanvasRef.current = fabricCanvas;
    setIsCanvasReady(true);

    // Add some sample objects for testing
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: 'rgba(255, 99, 132, 0.3)',
      stroke: '#ff6384',
      strokeWidth: 2,
    });

    const circle = new fabric.Circle({
      left: 250,
      top: 150,
      radius: 50,
      fill: 'rgba(54, 162, 235, 0.3)',
      stroke: '#36a2eb',
      strokeWidth: 2,
    });

    fabricCanvas.add(rect, circle);

    // Cleanup on unmount
    return () => {
      fabricCanvas.dispose();
    };
  }, [width, height]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && fabricCanvasRef.current) {
        const { width: containerWidth, height: containerHeight } = 
          containerRef.current.getBoundingClientRect();
        
        fabricCanvasRef.current.setDimensions({
          width: containerWidth,
          height: containerHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize

    return () => window.removeEventListener('resize', handleResize);
  }, [isCanvasReady]);

  const toggleDrawingMode = () => {
    if (fabricCanvasRef.current) {
      const isDrawing = fabricCanvasRef.current.isDrawingMode;
      fabricCanvasRef.current.isDrawingMode = !isDrawing;
    }
  };

  const clearCanvas = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';
      fabricCanvasRef.current.renderAll();
    }
  };

  const changeDrawingColor = (color: string) => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush.color = color;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Simple Multi-User Canvas</h1>
            <p className="text-gray-600">Draw and see other users' cursors in real-time</p>
          </div>
          
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDrawingMode}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {fabricCanvasRef.current?.isDrawingMode ? 'Select Mode' : 'Draw Mode'}
            </button>
            
            <div className="flex gap-2">
              {['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed'].map((color) => (
                <button
                  key={color}
                  onClick={() => changeDrawingColor(color)}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            <button
              onClick={clearCanvas}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto h-full">
          <div 
            ref={containerRef}
            className="relative w-full h-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{ cursor: 'none' }}
          >
            <canvas 
              ref={canvasRef}
              className="absolute inset-0"
            />
            
            {/* Cursor System Overlay */}
            {isCanvasReady && (
              <SimpleCursorSystem 
                containerRef={containerRef}
                roomId={roomId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCanvas;