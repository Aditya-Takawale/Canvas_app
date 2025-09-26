import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

interface BasicCanvasProps {
  width?: number;
  height?: number;
}

const BasicCanvas: React.FC<BasicCanvasProps> = ({ 
  width = 1200, 
  height = 800 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  const [currentTool, setCurrentTool] = useState<string>('PENCIL');
  const [color, setColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  
  // Initialize the fabric canvas - ONE TIME ONLY
  useEffect(() => {
    console.log('🎨 BasicCanvas: useEffect triggered', { 
      hasCanvasRef: !!canvasRef.current, 
      hasFabricCanvas: !!fabricCanvasRef.current 
    });
    
    if (canvasRef.current && !fabricCanvasRef.current) {
      console.log('🎨 BasicCanvas: Initializing canvas...');
      
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });
      
      const canvas = fabricCanvasRef.current;
      console.log('✅ BasicCanvas: Fabric canvas created');
      
      // Set up drawing mode
      canvas.isDrawingMode = currentTool === 'PENCIL';
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = brushSize;
      }
      
      // Simple event logging - no Redux, no operations
      canvas.on('path:created', (e: any) => {
        console.log('✏️ Path created on canvas');
        // Just let it stay on canvas - don't do anything else
      });
      
      canvas.on('object:added', (e: any) => {
        console.log('➕ Object added to canvas');
        // Just let it stay on canvas - don't do anything else
      });
      
      // Monitor canvas clearing
      const originalClear = canvas.clear;
      canvas.clear = function(...args) {
        console.error('🚨 BasicCanvas: CANVAS.CLEAR() WAS CALLED!', new Error().stack);
        return originalClear.apply(this, args);
      };
    }
    
    return () => {
      console.log('🧹 BasicCanvas: Cleanup - disposing canvas');
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once
  
  // Update canvas tool settings when tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    console.log('🔧 BasicCanvas: Updating tool settings', { currentTool, color, brushSize });
    
    canvas.isDrawingMode = currentTool === 'PENCIL';
    
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [currentTool, color, brushSize]);
  
  // Tool handlers
  const handleToolChange = (tool: string) => {
    console.log('🛠️ BasicCanvas: Tool changed to', tool);
    setCurrentTool(tool);
  };
  
  const handleColorChange = (newColor: string) => {
    console.log('🎨 BasicCanvas: Color changed to', newColor);
    setColor(newColor);
  };
  
  const handleBrushSizeChange = (newSize: number) => {
    console.log('📏 BasicCanvas: Brush size changed to', newSize);
    setBrushSize(newSize);
  };
  
  const handleClearCanvas = () => {
    console.log('🧹 BasicCanvas: Manual clear requested');
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
    }
  };
  
  const handleAddRectangle = () => {
    console.log('📦 BasicCanvas: Adding rectangle');
    if (!fabricCanvasRef.current) return;
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: 'transparent',
      stroke: color,
      strokeWidth: brushSize,
    });
    
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
    fabricCanvasRef.current.renderAll();
  };
  
  const handleAddCircle = () => {
    console.log('⭕ BasicCanvas: Adding circle');
    if (!fabricCanvasRef.current) return;
    
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: 'transparent',
      stroke: color,
      strokeWidth: brushSize,
    });
    
    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
    fabricCanvasRef.current.renderAll();
  };
  
  // Object count monitoring
  useEffect(() => {
    const checkObjects = () => {
      if (fabricCanvasRef.current) {
        const count = fabricCanvasRef.current.getObjects().length;
        console.log(`📊 BasicCanvas: Objects count: ${count}`);
      }
    };
    
    const interval = setInterval(checkObjects, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="basic-canvas-container w-full h-full flex flex-col bg-gray-100">
      {/* Simple toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center space-x-4">
        <h3 className="text-lg font-bold text-gray-800">Basic Drawing Canvas</h3>
        
        {/* Tools */}
        <div className="flex items-center space-x-2">
          <button 
            className={`px-3 py-1 rounded ${currentTool === 'PENCIL' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleToolChange('PENCIL')}
          >
            ✏️ Pencil
          </button>
          <button 
            className={`px-3 py-1 rounded ${currentTool === 'SELECT' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleToolChange('SELECT')}
          >
            👆 Select
          </button>
        </div>
        
        {/* Color */}
        <div className="flex items-center space-x-2">
          <label className="text-sm">Color:</label>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => handleColorChange(e.target.value)} 
            className="w-8 h-8 rounded cursor-pointer"
          />
        </div>
        
        {/* Brush size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm">Size: {brushSize}px</label>
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={brushSize} 
            onChange={(e) => handleBrushSizeChange(parseInt(e.target.value))} 
            className="w-20"
          />
        </div>
        
        {/* Shape tools */}
        <div className="flex items-center space-x-2">
          <button 
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            onClick={handleAddRectangle}
          >
            ⬛ Rectangle
          </button>
          <button 
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            onClick={handleAddCircle}
          >
            ⭕ Circle
          </button>
        </div>
        
        {/* Clear button */}
        <button 
          className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
          onClick={handleClearCanvas}
        >
          🗑️ Clear
        </button>
      </div>
      
      {/* Canvas area */}
      <div className="flex-1 bg-white flex items-center justify-center p-4">
        <div className="relative border border-gray-300 shadow-sm">
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

export default BasicCanvas;