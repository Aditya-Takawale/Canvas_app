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
 * FIGMA-STYLE CANVAS COMPONENT WITH ROOM ISOLATION AND TOOL SUPPORT
 * Based on successful patterns from Figma clones and collaborative canvas apps
 * 
 * Key principles:
 * 1. Single canvas instance - never recreate
 * 2. Minimal useEffect dependencies
 * 3. Proper object lifecycle management
 * 4. Separate rendering from state updates
 * 5. Event handler stability
 * 6. Room isolation - clear canvas when switching rooms
 * 7. Tool integration - connect Redux tool state to canvas
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
  const currentRoomIdRef = useRef<number | null>(null);
  
  // Shape drawing state
  const isDrawingShapeRef = useRef(false);
  const shapeStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<fabric.Object | null>(null);
  const panStateRef = useRef<{ isDragging: boolean; lastPosX: number; lastPosY: number }>({
    isDragging: false,
    lastPosX: 0,
    lastPosY: 0,
  });
  
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentCanvas } = useAppSelector((state) => state.canvas);

  // Optimized tool state selectors
  const activeTool = useAppSelector(state => (state.canvas as any).activeTool || 'pencil') as string;
  const brushSize = useAppSelector(state => (state.canvas as any).brushSize || 5) as number;
  const brushColor = useAppSelector(state => (state.canvas as any).brushColor || '#000000') as string;

  // Clear canvas when room changes to fix cross-room sharing
  useEffect(() => {
    if (currentRoomIdRef.current !== null && currentRoomIdRef.current !== roomId) {
      console.log(`🧹 FigmaStyle: Room changed from ${currentRoomIdRef.current} to ${roomId}, clearing canvas`);
      
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        // Clear canvas objects and reset state
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        
        // Reset state tracking refs
        lastRestoredStateRef.current = null;
        isLoadingStateRef.current = false;
      }
    }
    currentRoomIdRef.current = roomId;
  }, [roomId]);

  // Optimized tool settings application with debouncing
  const applyToolSettings = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Skip if already applying the same tool settings
    const currentSettings = `${activeTool}-${brushSize}-${brushColor}`;
    if ((canvas as any)._lastToolSettings === currentSettings) {
      return;
    }
    
    console.log('🛠️ FigmaStyle: Applying tool settings:', { activeTool, brushSize, brushColor });
    
    // Store settings to prevent duplicate applications
    (canvas as any)._lastToolSettings = currentSettings;

    // Batch canvas updates to reduce renders
    canvas.skipTargetFind = activeTool !== 'select';
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    canvas.moveCursor = 'move';

    // Set brush properties once
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = brushColor;
    }

    // Apply tool-specific settings with minimal operations
    switch (activeTool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.defaultCursor = 'crosshair';
        break;

      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.defaultCursor = 'crosshair';
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = canvas.backgroundColor as string || '#ffffff';
        }
        break;

      case 'select':
        canvas.selection = true;
        canvas.skipTargetFind = false;
        break;

      case 'pan':
        canvas.defaultCursor = 'grab';
        break;

      case 'text':
        canvas.selection = true;
        canvas.defaultCursor = 'text';
        break;

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'line':
      case 'arrow':
      case 'star':
      case 'polygon':
        canvas.defaultCursor = 'crosshair';
        break;

      default:
        canvas.selection = true;
    }

    // Single render call at the end
    canvas.requestRenderAll();
  }, [activeTool, brushSize, brushColor]);

  // Apply tool settings when they change (debounced for performance)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyToolSettings();
    }, 50); // 50ms debounce for smoother tool switching

    return () => clearTimeout(timeoutId);
  }, [activeTool, brushSize, brushColor]);

  // Shape creation functions
  const createShape = useCallback((startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, shapeType: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);

    const shapeOptions = {
      left,
      top,
      fill: 'transparent',
      stroke: brushColor,
      strokeWidth: Math.max(1, brushSize / 5),
      selectable: true,
      evented: true,
    };

    let shape: fabric.Object | null = null;

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          ...shapeOptions,
          width,
          height,
        });
        break;

      case 'circle':
        const radius = Math.min(width, height) / 2;
        shape = new fabric.Circle({
          ...shapeOptions,
          radius,
          left: left + width / 2 - radius,
          top: top + height / 2 - radius,
        });
        break;

      case 'triangle':
        const points = [
          { x: left + width / 2, y: top },
          { x: left, y: top + height },
          { x: left + width, y: top + height },
        ];
        shape = new fabric.Triangle({
          ...shapeOptions,
          width,
          height,
        });
        break;

      case 'line':
        shape = new fabric.Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
          ...shapeOptions,
          fill: '',
        });
        break;

      case 'arrow':
        // Create arrow using a group of line and triangle
        const arrowLine = new fabric.Line([0, 0, width, 0], {
          stroke: brushColor,
          strokeWidth: Math.max(1, brushSize / 5),
        });

        const arrowHead = new fabric.Triangle({
          width: 10,
          height: 10,
          fill: brushColor,
          left: width - 5,
          top: -5,
          angle: 90,
        });

        shape = new fabric.Group([arrowLine, arrowHead], {
          ...shapeOptions,
          left,
          top,
        });
        break;

      case 'star':
        // Create a 5-pointed star
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        const starPoints: { x: number; y: number }[] = [];

        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          starPoints.push({
            x: centerX + radius * Math.cos(angle - Math.PI / 2),
            y: centerY + radius * Math.sin(angle - Math.PI / 2),
          });
        }

        shape = new fabric.Polygon(starPoints, {
          ...shapeOptions,
          left,
          top,
        });
        break;

      case 'polygon':
        // Create a hexagon
        const hexPoints: { x: number; y: number }[] = [];
        const hexCenterX = width / 2;
        const hexCenterY = height / 2;
        const hexRadius = Math.min(width, height) / 2;

        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          hexPoints.push({
            x: hexCenterX + hexRadius * Math.cos(angle),
            y: hexCenterY + hexRadius * Math.sin(angle),
          });
        }

        shape = new fabric.Polygon(hexPoints, {
          ...shapeOptions,
          left,
          top,
        });
        break;
    }

    return shape;
  }, [brushColor, brushSize]);

  // Optimized mouse event handlers with performance improvements
  const handleMouseDown = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    // Handle different tools with minimal processing
    switch (activeTool) {
      case 'text':
        // Create text object at click position
        const text = new fabric.IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Arial',
          fontSize: Math.max(12, brushSize * 2),
          fill: brushColor,
          selectable: true,
          evented: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        break;

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'line':
      case 'arrow':
      case 'star':
      case 'polygon':
        isDrawingShapeRef.current = true;
        shapeStartPointRef.current = { x: pointer.x, y: pointer.y };
        break;

      case 'pan':
        // Enable canvas panning with minimal state changes
        panStateRef.current.isDragging = true;
        canvas.selection = false;
        panStateRef.current.lastPosX = e.e.clientX;
        panStateRef.current.lastPosY = e.e.clientY;
        break;
    }
  }, [activeTool, brushColor, brushSize]);

  const handleMouseMove = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    if (activeTool === 'pan' && panStateRef.current.isDragging) {
      // Handle canvas panning with minimal operations
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += e.e.clientX - panStateRef.current.lastPosX;
        vpt[5] += e.e.clientY - panStateRef.current.lastPosY;
        canvas.requestRenderAll();
        panStateRef.current.lastPosX = e.e.clientX;
        panStateRef.current.lastPosY = e.e.clientY;
      }
    } else if (isDrawingShapeRef.current && shapeStartPointRef.current) {
      // Handle shape drawing preview with reduced operations
      if (currentShapeRef.current) {
        canvas.remove(currentShapeRef.current);
      }

      const shape = createShape(shapeStartPointRef.current, pointer, activeTool);
      if (shape) {
        shape.selectable = false;
        shape.evented = false;
        shape.opacity = 0.5;
        canvas.add(shape);
        currentShapeRef.current = shape;
        canvas.requestRenderAll(); // Use requestRenderAll for better performance
      }
    }
  }, [activeTool, createShape]);

  const handleMouseUp = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    if (activeTool === 'pan') {
      // Stop panning
      panStateRef.current.isDragging = false;
      canvas.selection = true;
    } else if (isDrawingShapeRef.current && shapeStartPointRef.current) {
      // Finalize shape creation
      if (currentShapeRef.current) {
        canvas.remove(currentShapeRef.current);
      }

      const shape = createShape(shapeStartPointRef.current, pointer, activeTool);
      if (shape) {
        shape.selectable = true;
        shape.evented = true;
        shape.opacity = 1;
        canvas.add(shape);
        canvas.setActiveObject(shape);
      }

      // Reset shape drawing state
      isDrawingShapeRef.current = false;
      shapeStartPointRef.current = null;
      currentShapeRef.current = null;
    }
  }, [activeTool, createShape]);

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

    // Apply initial tool settings
    applyToolSettings();

    // Log canvas operations for debugging (non-intrusive)
    console.log('🎨 FigmaStyle: Canvas ready with dimensions:', { width, height });

    // Attach stable event handlers
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    
    // Attach mouse event handlers for shape creation and interaction
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

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
          
          // Apply tool settings after state restoration
          applyToolSettings();
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
  }, [currentCanvas?.state, handlePathCreated, handleObjectAdded, handleObjectRemoved, applyToolSettings]);

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
        <h3 style={{ margin: 0, color: '#333' }}>🎨 Enhanced Canvas - Room {roomId}</h3>
        
        <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '8px' }}>
          <span>Tool: {activeTool}</span>
          <span>Size: {brushSize}px</span>
          <span>Color: {brushColor}</span>
        </div>
        
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