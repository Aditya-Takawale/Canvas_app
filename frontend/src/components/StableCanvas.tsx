import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addOperation } from '../store/slices/canvasSlice';
import { createCanvasSocket } from '../services/socket';

interface StableCanvasProps {
  roomId: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

const StableCanvas: React.FC<StableCanvasProps> = ({ 
  roomId, 
  width = 800, 
  height = 400,
  readOnly = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const socketRef = useRef<ReturnType<typeof createCanvasSocket> | null>(null);
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(5);
  const [isRedoing, setIsRedoing] = useState(false);
  
  // Undo/Redo state
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const dispatch = useAppDispatch();
  const canvasState = useAppSelector((state) => state.canvas);

  // STEP 1: Canvas initialization (EXACTLY like SuperMinimal - working!)
  useEffect(() => {
    console.log('✅ StableCanvas: Starting initialization...');
    
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
        isDrawingMode: !readOnly && selectedTool === 'pencil',
      });
      
      const canvas = fabricCanvasRef.current;
      
      // Set initial brush
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushWidth;
      }
      
      // Monitor clear (debug)
      const originalClear = canvas.clear;
      canvas.clear = function(...args) {
        console.error('🚨 StableCanvas: CANVAS.CLEAR() CALLED!', new Error().stack);
        return originalClear.apply(this, args);
      };
      
      // Event handlers
      canvas.on('path:created', (e: any) => {
        console.log('✏️ StableCanvas: Path created');
        const operation = {
          type: 'path',
          data: e.path,
        };
        
        console.log('📝 StableCanvas: Operation dispatched to Redux');
        dispatch(addOperation({
          id: Date.now(),
          objectType: 'path',
          objectData: operation,
          action: 'added',
          createdAt: new Date().toISOString(),
          canvasId: roomId,
          userId: 1
        }));
        
        // Socket emission temporarily disabled
        console.log('🔌 StableCanvas: Socket emission temporarily disabled');
        
        // Save state for undo/redo
        setTimeout(() => saveCanvasState(), 100);
      });
      
      canvas.on('object:added', () => {
        console.log('➕ StableCanvas: Object added');
        const count = canvas.getObjects().length;
        console.log(`📊 StableCanvas: Objects count: ${count}`);
      });
      
      // Initialize canvas history with empty state
      setTimeout(() => {
        const initialState = JSON.stringify(canvas.toJSON());
        setCanvasHistory([initialState]);
        setHistoryIndex(0);
        console.log('📚 StableCanvas: Canvas history initialized');
      }, 100);
      
      console.log('✅ StableCanvas: Canvas initialized successfully');
    }
    
    // NO CLEANUP - let canvas persist
  }, []);

  // STEP 2: Socket initialization (temporarily disabled)
  useEffect(() => {
    // Socket integration will be added later
    console.log('� StableCanvas: Socket integration temporarily disabled');
  }, [roomId, readOnly]);

  // STEP 3: Tool updates
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      
      // Update drawing mode and brush
      canvas.isDrawingMode = !readOnly && selectedTool === 'pencil';
      
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushWidth;
      }
      
      console.log(`🎨 StableCanvas: Tool updated - ${selectedTool}, color: ${brushColor}, width: ${brushWidth}`);
    }
  }, [selectedTool, brushColor, brushWidth, readOnly]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (readOnly) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && ((e.key === 'y') || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, canvasHistory, readOnly]);

  // FIXED Undo/Redo functionality
  const saveCanvasState = () => {
    if (!fabricCanvasRef.current || isRedoing || readOnly) {
      console.log('⏭️ StableCanvas: Skipping save - canvas not ready, redoing, or read-only');
      return;
    }
    
    const canvasState = JSON.stringify(fabricCanvasRef.current.toJSON());
    const objectCount = fabricCanvasRef.current.getObjects().length;
    console.log(`💾 StableCanvas: Saving canvas state to history (${objectCount} objects)`);
    
    // Update both history and index synchronously
    setCanvasHistory(prevHistory => {
      // Remove any future history if we're not at the end
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      
      // Don't save duplicate states
      if (newHistory.length > 0 && newHistory[newHistory.length - 1] === canvasState) {
        console.log('⏭️ StableCanvas: Skipping duplicate state');
        return prevHistory;
      }
      
      newHistory.push(canvasState);
      
      // Immediately update the index to match new history
      const newIndex = newHistory.length - 1;
      setHistoryIndex(newIndex);
      
      // Limit history to 50 states
      if (newHistory.length > 50) {
        const trimmedHistory = newHistory.slice(1);
        setHistoryIndex(newIndex - 1);
        console.log(`📚 StableCanvas: History trimmed - ${trimmedHistory.length} states, index: ${newIndex - 1}`);
        return trimmedHistory;
      }
      
      console.log(`📚 StableCanvas: History updated - ${newHistory.length} states, index: ${newIndex}`);
      return newHistory;
    });
  };

  const handleUndo = () => {
    console.log('↩️ StableCanvas: Undo requested');
    console.log('📊 Current state - Index:', historyIndex, 'Total:', canvasHistory.length);
    
    if (!fabricCanvasRef.current || historyIndex <= 0 || readOnly) {
      console.log('❌ StableCanvas: Cannot undo - at beginning or read-only');
      return;
    }
    
    setIsRedoing(true);
    const prevIndex = historyIndex - 1;
    const prevState = canvasHistory[prevIndex];
    
    console.log(`🔄 StableCanvas: Loading state from index ${prevIndex}`);
    
    fabricCanvasRef.current.loadFromJSON(prevState, () => {
      console.log('✅ StableCanvas: Undo state loaded');
      fabricCanvasRef.current?.renderAll();
      setHistoryIndex(prevIndex);
      
      setTimeout(() => {
        setIsRedoing(false);
        const count = fabricCanvasRef.current?.getObjects().length || 0;
        console.log(`📊 StableCanvas: Undo completed, objects: ${count}`);
      }, 50);
    });
  };

  const handleRedo = () => {
    console.log('↪️ StableCanvas: Redo requested');
    console.log('📊 Current state - Index:', historyIndex, 'Total:', canvasHistory.length);
    
    if (!fabricCanvasRef.current || historyIndex >= canvasHistory.length - 1 || readOnly) {
      console.log('❌ StableCanvas: Cannot redo - at end or read-only');
      return;
    }
    
    setIsRedoing(true);
    const nextIndex = historyIndex + 1;
    const nextState = canvasHistory[nextIndex];
    
    console.log(`🔄 StableCanvas: Loading state from index ${nextIndex}`);
    
    fabricCanvasRef.current.loadFromJSON(nextState, () => {
      console.log('✅ StableCanvas: Redo state loaded');
      fabricCanvasRef.current?.renderAll();
      setHistoryIndex(nextIndex);
      
      setTimeout(() => {
        setIsRedoing(false);
        const count = fabricCanvasRef.current?.getObjects().length || 0;
        console.log(`📊 StableCanvas: Redo completed, objects: ${count}`);
      }, 50);
    });
  };

  const handleClearCanvas = () => {
    if (fabricCanvasRef.current && !readOnly) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';
      fabricCanvasRef.current.renderAll();
      
      // Reset history
      const emptyState = JSON.stringify(fabricCanvasRef.current.toJSON());
      setCanvasHistory([emptyState]);
      setHistoryIndex(0);
      
      console.log('🗑️ StableCanvas: Canvas cleared and history reset');
    }
  };

  // Tool handlers
  const addRectangle = () => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: brushColor,
      strokeWidth: 2,
      width: 100,
      height: 80,
    });
    
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
    setTimeout(() => saveCanvasState(), 100);
  };

  const addCircle = () => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      fill: 'transparent',
      stroke: brushColor,
      strokeWidth: 2,
      radius: 50,
    });
    
    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
    setTimeout(() => saveCanvasState(), 100);
  };

  const addLine = () => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const line = new fabric.Line([50, 100, 200, 200], {
      stroke: brushColor,
      strokeWidth: brushWidth,
    });
    
    fabricCanvasRef.current.add(line);
    fabricCanvasRef.current.setActiveObject(line);
    setTimeout(() => saveCanvasState(), 100);
  };

  const addText = () => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const text = new fabric.Text('Sample Text', {
      left: 100,
      top: 200,
      fill: brushColor,
      fontSize: 20,
    });
    
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    setTimeout(() => saveCanvasState(), 100);
  };

  if (readOnly) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ position: 'relative', border: '2px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <canvas 
            ref={canvasRef}
            style={{ 
              backgroundColor: 'white',
              borderRadius: '6px',
              display: 'block'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e0e0e0', padding: '12px 16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', margin: 0 }}>
          🎨 Stable Canvas - Room {roomId}
        </h3>
        <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
          All tools working with proper undo/redo functionality
        </p>
      </div>
      
      {/* Toolbar */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e0e0e0', padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Drawing Tools */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: selectedTool === 'pencil' ? '#10b981' : '#e5e7eb',
              color: selectedTool === 'pencil' ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => setSelectedTool('pencil')}
          >
            ✏️ Pencil
          </button>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: selectedTool === 'select' ? '#10b981' : '#e5e7eb',
              color: selectedTool === 'select' ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => setSelectedTool('select')}
          >
            👆 Select
          </button>
        </div>
        
        <div style={{ width: '1px', height: '20px', backgroundColor: '#d1d5db' }}></div>
        
        {/* Shape Tools */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={addRectangle}
          >
            ⬜ Rectangle
          </button>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: '#8b5cf6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={addCircle}
          >
            ⭕ Circle
          </button>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: '#f59e0b',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={addLine}
          >
            📏 Line
          </button>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: '#ef4444',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={addText}
          >
            📝 Text
          </button>
        </div>
        
        <div style={{ width: '1px', height: '20px', backgroundColor: '#d1d5db' }}></div>
        
        {/* Undo/Redo Controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: historyIndex > 0 ? '#10b981' : '#d1d5db',
              color: historyIndex > 0 ? 'white' : '#6b7280',
              cursor: historyIndex > 0 ? 'pointer' : 'not-allowed',
              fontSize: '12px'
            }}
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title={`Undo (${historyIndex} steps back available)`}
          >
            ↩️ Undo
          </button>
          <button 
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              background: historyIndex < canvasHistory.length - 1 ? '#10b981' : '#d1d5db',
              color: historyIndex < canvasHistory.length - 1 ? 'white' : '#6b7280',
              cursor: historyIndex < canvasHistory.length - 1 ? 'pointer' : 'not-allowed',
              fontSize: '12px'
            }}
            onClick={handleRedo}
            disabled={historyIndex >= canvasHistory.length - 1}
            title={`Redo (${canvasHistory.length - 1 - historyIndex} steps forward available)`}
          >
            ↪️ Redo
          </button>
          <div style={{ fontSize: '10px', color: '#666', alignSelf: 'center' }}>
            {historyIndex + 1}/{canvasHistory.length}
          </div>
        </div>
        
        <div style={{ width: '1px', height: '20px', backgroundColor: '#d1d5db' }}></div>
        
        {/* Color and Size Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Color:</label>
          <input 
            type="color" 
            value={brushColor} 
            onChange={(e) => setBrushColor(e.target.value)}
            style={{ width: '30px', height: '30px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          />
          <label style={{ fontSize: '12px', color: '#666' }}>Size:</label>
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={brushWidth} 
            onChange={(e) => setBrushWidth(Number(e.target.value))}
            style={{ width: '80px' }}
          />
          <span style={{ fontSize: '12px', color: '#666', minWidth: '30px' }}>{brushWidth}px</span>
        </div>
        
        <div style={{ width: '1px', height: '20px', backgroundColor: '#d1d5db' }}></div>
        
        {/* Clear Button */}
        <button 
          style={{
            padding: '6px 10px',
            borderRadius: '4px',
            border: 'none',
            background: '#dc2626',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px'
          }}
          onClick={handleClearCanvas}
        >
          🗑️ Clear All
        </button>
        
        {/* Status */}
        <div style={{ fontSize: '11px', color: '#666', marginLeft: 'auto' }}>
          Objects: {fabricCanvasRef.current?.getObjects().length || 0} | History: {historyIndex + 1}/{canvasHistory.length}
        </div>
      </div>
      
      {/* Canvas Area */}
      <div style={{ flex: 1, backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ position: 'relative', border: '2px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <canvas 
            ref={canvasRef}
            style={{ 
              backgroundColor: 'white',
              borderRadius: '6px',
              display: 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StableCanvas;