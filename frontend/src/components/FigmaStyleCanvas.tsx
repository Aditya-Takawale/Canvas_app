import React, { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addOperation, saveCanvasState, fetchCanvas } from '../store/slices/canvasSlice';
import { createCanvasSocket } from '../services/socket';

interface FigmaStyleCanvasProps {
  roomId: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

/**
 * FIGMA-STYLE CANVAS COMPONENT
 * Based on successful patterns from Figma clones and collaborative canvas apps
 * 
 * Key principles:
 * 1. Single canvas instance - never recreate
 * 2. Minimal useEffect dependencies
 * 3. Proper object lifecycle management
 * 4. Separate rendering from state updates
 * 5. Event handler stability
 */
const FigmaStyleCanvas: React.FC<FigmaStyleCanvasProps> = ({ 
  roomId, 
  width = 1200, 
  height = 800, 
  readOnly = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const socketRef = useRef<ReturnType<typeof createCanvasSocket> | null>(null);
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingStateRef = useRef(false);
  const lastRestoredStateRef = useRef<string | null>(null);
  
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentCanvas } = useAppSelector((state) => state.canvas);

  // Debounced save function with room isolation
  const debouncedSave = useCallback(() => {
    if (isLoadingStateRef.current) {
      console.log('🛑 FigmaStyle: Skipping save - currently loading state');
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isLoadingStateRef.current) {
        console.log('🛑 FigmaStyle: Save cancelled - no canvas or loading state');
        return;
      }
      
      const canvasState = canvas.toJSON();
      console.log(`💾 FigmaStyle: Auto-saving canvas state for room ${roomId}...`);
      
      // Only save if we have a valid current canvas context
      if (currentCanvas && currentCanvas.roomId === roomId) {
        dispatch(saveCanvasState({
          roomId,
          state: canvasState
        }));
      } else {
        console.warn(`⚠️ FigmaStyle: Skipping save - room mismatch (current: ${currentCanvas?.roomId}, expected: ${roomId})`);
      }
    }, 5000); // Increased to 5 seconds to reduce save frequency
  }, [roomId, dispatch, currentCanvas]);

  // Load canvas state from database - ONLY ONCE
  const loadCanvasState = useCallback(async () => {
    if (isLoadingStateRef.current) return; // Prevent multiple loads
    
    console.log('📥 FigmaStyle: Loading canvas state from database...');
    isLoadingStateRef.current = true;
    
    try {
      // Only fetch if we don't already have canvas state to prevent infinite loops
      if (!currentCanvas?.state) {
        await dispatch(fetchCanvas(roomId));
      } else {
        console.log('📋 FigmaStyle: Canvas state already loaded, skipping fetch');
        isLoadingStateRef.current = false;
      }
    } catch (error) {
      console.error('❌ FigmaStyle: Failed to load canvas state:', error);
      isLoadingStateRef.current = false;
    }
  }, [roomId, dispatch, currentCanvas?.state]);

  // Stable event handlers using useCallback
  const handlePathCreated = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !user || isLoadingStateRef.current) {
      console.log('🛑 FigmaStyle: Skipping path creation - loading state or no user');
      return;
    }

    console.log('✏️ FigmaStyle: Path created');
    const objectCount = canvas.getObjects().length;
    console.log(`📊 FigmaStyle: Objects after creation: ${objectCount}`);

    // Create operation for socket transmission
    const operation = {
      objectType: 'path',
      objectData: {
        pathData: e.path?.toJSON() || {},
        timestamp: Date.now(),
      },
      action: 'added'
    };

    // Dispatch to Redux with proper room isolation
    dispatch(addOperation({
      id: Date.now(),
      objectType: 'path',
      objectData: operation.objectData,
      action: 'added',
      createdAt: new Date().toISOString(),
      canvasId: currentCanvas?.id || roomId, // Use actual canvas ID, fallback to roomId
      userId: user.id
    }));

    // Emit via socket
    if (socketRef.current?.isConnected()) {
      console.log('🚀 FigmaStyle: Emitting drawing operation');
      socketRef.current.emitDrawingOperation(operation);
    }

    // Auto-save canvas state to database (debounced)
    debouncedSave();

    // Monitor for object disappearance (debugging)
    setTimeout(() => {
      const currentCount = canvas.getObjects().length;
      if (currentCount < objectCount) {
        console.error(`❌ FigmaStyle: Objects disappeared! Was ${objectCount}, now ${currentCount}`);
      }
    }, 1000);
  }, [user, roomId, dispatch, debouncedSave]);

  const handleObjectAdded = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;
    
    console.log(`➕ FigmaStyle: Object added (${e.target?.type}). Total: ${canvas.getObjects().length}`);
    
    // Auto-save after object addition (debounced)
    debouncedSave();
  }, [debouncedSave]);

  const handleObjectRemoved = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;
    
    console.error(`🗑️ FigmaStyle: Object removed (${e.target?.type}). Total: ${canvas.getObjects().length}`);
    
    // Auto-save after object removal (debounced)
    debouncedSave();
  }, [debouncedSave]);

  // Canvas initialization - ONLY ONCE
  useEffect(() => {
    if (isInitializedRef.current || !canvasRef.current) return;
    
    console.log('🎨 FigmaStyle: Initializing canvas (one-time only)');
    
    // Create canvas instance
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      isDrawingMode: !readOnly,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      skipTargetFind: false,
      selection: !readOnly,
    });

    fabricCanvasRef.current = canvas;
    isInitializedRef.current = true;

    // Configure brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = 3;
    }

    // Log canvas operations for debugging (non-intrusive)
    console.log('� FigmaStyle: Canvas ready with dimensions:', { width, height });

    // Attach stable event handlers
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);

    console.log('✅ FigmaStyle: Canvas initialization complete');

    // Load existing canvas state from database - ONLY ONCE during initialization
    setTimeout(() => {
      if (fabricCanvasRef.current === canvas) { // Ensure canvas is still valid
        loadCanvasState();
      }
    }, 200); // Slightly longer delay to ensure stability

    // Cleanup function
    return () => {
      console.log('🧹 FigmaStyle: Component unmounting, disposing canvas');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Clean up refs
      isInitializedRef.current = false;
      lastRestoredStateRef.current = null;
      isLoadingStateRef.current = false;
      
      // Dispose canvas
      canvas.dispose();
    };
  }, []); // CRITICAL: Empty dependencies - only run once

  // Socket initialization - separate from canvas
  useEffect(() => {
    if (!user || readOnly) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    console.log('🔌 FigmaStyle: Initializing socket connection');
    
    socketRef.current = createCanvasSocket({
      url: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
      roomId,
      userId: user.id,
      token,
      dispatch,
    });

    socketRef.current.connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('🔌 FigmaStyle: Socket disconnected');
      }
    };
  }, [roomId, user, dispatch, readOnly]);

  // Canvas state restoration from database - STABLE VERSION  
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentCanvas?.state || isLoadingStateRef.current) {
      return;
    }
    
    // Prevent restoring the same state multiple times
    const stateString = JSON.stringify(currentCanvas.state);
    if (lastRestoredStateRef.current === stateString) {
      console.log('🛑 FigmaStyle: State already restored, skipping');
      return;
    }

    console.log('📥 FigmaStyle: Restoring canvas state from database...');
    isLoadingStateRef.current = true;
    lastRestoredStateRef.current = stateString;
    
    try {
      // Temporarily disable ALL event handlers during loading
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      
      canvas.loadFromJSON(currentCanvas.state, () => {
        const objectCount = canvas.getObjects().length;
        console.log(`✅ FigmaStyle: Canvas state restored! Objects: ${objectCount}`);
        
        // Re-enable event handlers after a short delay
        setTimeout(() => {
          canvas.on('path:created', handlePathCreated);
          canvas.on('object:added', handleObjectAdded);
          canvas.on('object:removed', handleObjectRemoved);
          isLoadingStateRef.current = false;
        }, 100);
      });
    } catch (error) {
      console.error('❌ FigmaStyle: Failed to restore canvas state:', error);
      
      // Re-enable event handlers even on error
      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);
      canvas.on('object:removed', handleObjectRemoved);
      isLoadingStateRef.current = false;
      lastRestoredStateRef.current = null; // Allow retry
    }
  }, [currentCanvas?.state, handlePathCreated, handleObjectAdded, handleObjectRemoved]);

  // Tool controls
  const handleToggleDrawing = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    canvas.isDrawingMode = !canvas.isDrawingMode;
    console.log(`🖊️ FigmaStyle: Drawing mode: ${canvas.isDrawingMode}`);
  };

  const handleAddRectangle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || readOnly) return;

    const rect = new fabric.Rect({
      left: Math.random() * 200 + 100,
      top: Math.random() * 200 + 100,
      width: 100,
      height: 60,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });

    canvas.add(rect);
    console.log(`📦 FigmaStyle: Rectangle added. Total objects: ${canvas.getObjects().length}`);
    
    // Auto-save after adding rectangle
    debouncedSave();
  };

  const handleClearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || readOnly) return;

    console.log('🧹 FigmaStyle: Manual clear requested');
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    
    // Auto-save after clearing
    debouncedSave();
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Toolbar */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>🎨 Figma-Style Canvas - Room {roomId}</h3>
        
        <button
          onClick={handleToggleDrawing}
          style={{
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ✏️ Toggle Drawing
        </button>
        
        <button
          onClick={handleAddRectangle}
          style={{
            padding: '6px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ⬛ Add Rectangle
        </button>
        
        <button
          onClick={handleClearCanvas}
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear
        </button>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
          Objects: {fabricCanvasRef.current?.getObjects().length || 0}
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ 
        flex: 1, 
        backgroundColor: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          border: '2px solid #ddd', 
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default FigmaStyleCanvas;