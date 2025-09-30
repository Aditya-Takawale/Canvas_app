import React, { useEffect, useRef, useCallback, useState } from 'react';
import { fabric } from 'fabric';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addOperation, saveCanvasState, fetchCanvasHistory, setActiveUsers, updateUserCursor } from '../store/slices/canvasSlice';
import { createCanvasSocket } from '../services/socket';
import DrawingToolbar from './DrawingToolbar';
import PropertiesPanel from './PropertiesPanel';
import LiveCursors from './LiveCursors';

interface EnhancedFigmaStyleCanvasProps {
  roomId: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

/**
 * Enhanced FigmaStyleCanvas with full Figma-like interface
 * Includes left toolbar, right properties panel, and live cursors
 */
const EnhancedFigmaStyleCanvas: React.FC<EnhancedFigmaStyleCanvasProps> = ({
  roomId,
  width = 800,
  height = 600,
  readOnly = false
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { currentCanvas, activeUsers, operations } = useAppSelector(state => state.canvas);
  
  // Canvas and socket refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const socketRef = useRef<any>(null);
  const isLoadingStateRef = useRef(false);
  
  // Debounced save for performance
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get tool properties from Redux store (with fallbacks for TypeScript)
  const activeTool = (useAppSelector(state => (state.canvas as any).activeTool) || 'pencil') as string;
  const brushSize = (useAppSelector(state => (state.canvas as any).brushSize) || 5) as number;
  const brushColor = (useAppSelector(state => (state.canvas as any).brushColor) || '#000000') as string;

  console.log('🎨 EnhancedFigmaStyleCanvas render:', { 
    roomId, 
    canvasExists: !!fabricCanvasRef.current,
    operationsCount: operations?.length || 0,
    activeTool,
    brushSize,
    brushColor
  });

  // Stable event handlers using useCallback
  const handleObjectAdded = useCallback((e: fabric.IEvent) => {
    const obj = e.target;
    if (!obj || isLoadingStateRef.current) return;

    console.log('📝 Object added:', obj.type);
    
    const operation = {
      objectType: obj.type || 'unknown',
      objectData: obj.toObject(),
      action: 'add'
    };

    dispatch(addOperation(operation));
    
    // Emit to other users via socket
    if (socket.isConnected()) {
      socket.emitDrawingOperation(operation);
    }

    // Auto-save with debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (fabricCanvasRef.current) {
        const canvasState = fabricCanvasRef.current.toJSON();
        dispatch(saveCanvasState({ roomId, state: canvasState }));
      }
    }, 2000);
  }, [dispatch, roomId]);

  const handleObjectRemoved = useCallback((e: fabric.IEvent) => {
    const obj = e.target;
    if (!obj || isLoadingStateRef.current) return;

    console.log('🗑️ Object removed:', obj.type);
    
    const operation = {
      objectType: obj.type || 'unknown',
      objectData: obj.toObject(),
      action: 'remove'
    };

    dispatch(addOperation(operation));
    
    if (socket.isConnected()) {
      socket.emitDrawingOperation(operation);
    }
  }, [dispatch]);

  const handlePathCreated = useCallback((e: fabric.IEvent) => {
    const path = e.path;
    if (!path || isLoadingStateRef.current) return;

    console.log('✏️ Path created');
    
    const operation = {
      objectType: 'path',
      objectData: path.toObject(),
      action: 'add'
    };

    dispatch(addOperation(operation));
    
    if (socket.isConnected()) {
      socket.emitDrawingOperation(operation);
    }

    // Auto-save with debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (fabricCanvasRef.current) {
        const canvasState = fabricCanvasRef.current.toJSON();
        dispatch(saveCanvasState({ roomId, state: canvasState }));
      }
    }, 2000);
  }, [dispatch, roomId]);

  // Load canvas state from database
  const loadCanvasState = useCallback(async () => {
    if (isLoadingStateRef.current) {
      console.log('🛑 loadCanvasState: Already loading, skipping');
      return;
    }
    
    isLoadingStateRef.current = true;
    console.log('📥 Loading canvas state for room:', roomId);
    
    try {
      const result = await dispatch(fetchCanvasHistory({ roomId }));
      
      if (fetchCanvasHistory.fulfilled.match(result) && fabricCanvasRef.current) {
        const historyData = result.payload.data;
        
        if (historyData.state) {
          console.log('🔄 Loading canvas state from database');
          fabricCanvasRef.current.loadFromJSON(historyData.state, () => {
            fabricCanvasRef.current?.renderAll();
            console.log('✅ Canvas state loaded successfully');
            isLoadingStateRef.current = false;
          });
        } else {
          console.log('📭 No canvas state found in database');
          isLoadingStateRef.current = false;
        }
      } else {
        console.log('❌ Failed to fetch canvas history');
        isLoadingStateRef.current = false;
      }
    } catch (error) {
      console.error('💥 Error loading canvas state:', error);
      isLoadingStateRef.current = false;
    }
  }, [dispatch, roomId]);

  // Apply drawing tool settings
  const applyToolSettings = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    
    // Reset all modes first
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    switch (activeTool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = brushColor;
        break;
        
      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = '#ffffff'; // Eraser uses white
        break;
        
      case 'select':
        canvas.selection = true;
        canvas.isDrawingMode = false;
        break;
        
      default:
        // For shape tools (rectangle, circle, line, text), we'll handle them with mouse events
        canvas.isDrawingMode = false;
        canvas.selection = false;
        break;
    }
  }, [activeTool, brushSize, brushColor]);

  // Initialize Fabric.js canvas (only once)
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) {
      console.log('🛑 Canvas initialization skipped - either no ref or already exists');
      return;
    }

    console.log('🎨 Initializing Fabric.js canvas');
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: !readOnly,
      isDrawingMode: false,
    });

    fabricCanvasRef.current = canvas;

    // Apply initial tool settings
    applyToolSettings();
    
    console.log('✅ Fabric.js canvas created successfully');

    // Load existing canvas state
    loadCanvasState();

    return () => {
      console.log('🧹 Cleaning up Fabric.js canvas');
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [width, height, readOnly, loadCanvasState, applyToolSettings]);

  // Set up event listeners (only when canvas changes)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    console.log('🔗 Setting up canvas event listeners');

    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    canvas.on('path:created', handlePathCreated);

    return () => {
      console.log('🔗 Removing canvas event listeners');
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      canvas.off('path:created', handlePathCreated);
    };
  }, [handleObjectAdded, handleObjectRemoved, handlePathCreated]);

  // Apply tool settings when they change
  useEffect(() => {
    applyToolSettings();
  }, [applyToolSettings]);

  // Socket event listeners
  useEffect(() => {
    if (!socket.isConnected()) return;

    const handleDrawingOperation = (operation: any) => {
      console.log('📡 Received drawing operation:', operation);
      
      if (!fabricCanvasRef.current || isLoadingStateRef.current) {
        console.log('🛑 Cannot apply operation - canvas not ready or loading');
        return;
      }

      // Create fabric object from operation data
      fabric.util.enlivenObjects([operation.objectData], (objects: fabric.Object[]) => {
        const obj = objects[0];
        if (obj && fabricCanvasRef.current) {
          isLoadingStateRef.current = true;
          fabricCanvasRef.current.add(obj);
          fabricCanvasRef.current.renderAll();
          isLoadingStateRef.current = false;
        }
      });
    };

    const handleUserJoined = (data: any) => {
      console.log('👋 User joined:', data);
      dispatch(setActiveUsers(data.users || []));
    };

    const handleUserLeft = (data: any) => {
      console.log('👋 User left:', data);
      dispatch(setActiveUsers(data.users || []));
    };

    const handleCursorMove = (data: any) => {
      if (data.userId !== user?.id) {
        dispatch(updateUserCursor({
          userId: data.userId,
          cursorPosition: { x: data.x, y: data.y }
        }));
      }
    };

    // Register socket listeners
    socket.onDrawingOperation(handleDrawingOperation);
    socket.onUserJoined(handleUserJoined);
    socket.onUserLeft(handleUserLeft);
    socket.onCursorMove(handleCursorMove);

    return () => {
      socket.off('drawing-operation', handleDrawingOperation);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('cursor-move', handleCursorMove);
    };
  }, [dispatch, user?.id]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar - Drawing Tools */}
      <DrawingToolbar />
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Container */}
        <div 
          className="flex-1 flex items-center justify-center bg-white m-4 rounded-lg shadow-sm border border-gray-200 relative overflow-hidden"
        >
          {/* Live Cursors Overlay */}
          <LiveCursors 
            canvasRef={{ current: canvasRef.current }} 
            socketRef={socketRef} 
          />
          
          {/* Main Canvas */}
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded-md shadow-sm"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
          
          {/* Canvas Info Overlay */}
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded-md text-sm text-gray-600">
            Room: {roomId} | Users: {activeUsers.length} | Tool: {activeTool}
          </div>
        </div>
      </div>
      
      {/* Right Sidebar - Properties Panel */}
      <PropertiesPanel />
    </div>
  );
};

export default EnhancedFigmaStyleCanvas;