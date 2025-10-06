import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { fabric } from 'fabric';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addOperation, saveCanvasState, fetchCanvas, clearOperations, fetchCanvasHistory } from '../store/slices/canvasSlice';
import { createCanvasSocket } from '../services/socket';
import roomLoadingManager from '../services/roomLoadingManager';
import { socketUrl } from '../config/environment';

interface CursorsOnlyFigmaCanvasProps {
  roomId: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

/**
 * A version of the FigmaStyleCanvas that shows all user cursors
 * but does not allow switching between users
 */
const CursorsOnlyFigmaCanvas: React.FC<CursorsOnlyFigmaCanvasProps> = ({ 
  roomId, 
  width = 1200, 
  height = 800, 
  readOnly = false 
}) => {
  // Canvas refs and state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const socketRef = useRef<ReturnType<typeof createCanvasSocket> | null>(null);
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingStateRef = useRef(false);
  const lastRestoredStateRef = useRef<string | null>(null);
  const currentRoomIdRef = useRef<number | null>(null);
  
  // Drawing state refs
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
  
  // Create stable references to prevent unnecessary re-renders
  const userId = useMemo(() => user?.id, [user?.id]);
  const isUserReady = useMemo(() => !!user && !!userId, [user, userId]);
  const { currentCanvas } = useAppSelector((state) => state.canvas);

  // Tool state from Redux
  const activeTool = useAppSelector(state => (state.canvas as any).activeTool || 'pencil') as string;
  const brushSize = useAppSelector(state => (state.canvas as any).brushSize || 5) as number;
  const brushColor = useAppSelector(state => (state.canvas as any).brushColor || '#000000') as string;

  // Multi-user cursor system - direct implementation following best practices
  const otherCursorsRef = useRef<Record<string, HTMLElement>>({});
  const [showCursors, setShowCursors] = useState(true);

  // Toggle cursor visibility
  const toggleShowCursors = useCallback(() => {
    setShowCursors(prev => {
      const newValue = !prev;
      // Update visibility of all cursor elements
      Object.values(otherCursorsRef.current).forEach(cursor => {
        cursor.style.display = newValue ? 'block' : 'none';
      });
      return newValue;
    });
  }, []);

  // Send our cursor position to server (broadcasts to all other clients)
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (socketRef.current?.isConnected()) {
      socketRef.current.emitCursorPosition({ x, y });
    }
  }, []);

  // UI state
  const [isCursorDisplayVisible, setIsCursorDisplayVisible] = useState(false);
  const [isCanvasLoading, setIsCanvasLoading] = useState(true); // Internal loading state

  // Optimized tool settings application with debouncing
  const applyToolSettings = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Always use the selected brush color from Redux
    
    // ALWAYS apply tool settings to ensure consistent behavior
    console.log('🛠️ CursorsOnly: Applying tool settings:', { 
      activeTool, 
      brushSize, 
      brushColor, 
      user: user?.username 
    });
    
    // Store settings for reference
    (canvas as any)._lastToolSettings = `${activeTool}-${brushSize}-${brushColor}`;

    // Batch canvas updates to reduce renders
    canvas.skipTargetFind = activeTool !== 'select';
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    canvas.moveCursor = 'move';

    // FORCE brush properties to use the selected color
    if (canvas.freeDrawingBrush) {
      // Always ensure these are set correctly
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = brushColor; // ALWAYS use selected brush color
      
      // Force any necessary brush-specific settings
      if (canvas.freeDrawingBrush.shadow && typeof canvas.freeDrawingBrush.shadow !== 'string') {
        // Only set shadow color if it's a Shadow object, not a string
        (canvas.freeDrawingBrush.shadow as fabric.Shadow).color = brushColor;
      }
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

  // Apply tool settings when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyToolSettings();
    }, 50); // 50ms debounce for smoother tool switching

    return () => clearTimeout(timeoutId);
  }, [activeTool, brushSize, brushColor, applyToolSettings]);
  
  // Ensure brush color is consistently applied
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    console.log('🎨 Setting brush color on change to:', brushColor);
    
    // Force brush color to be consistent with selected color
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
    }
    
    // Update any selected objects to use the new color if needed
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0 && activeTool === 'select') {
      activeObjects.forEach(obj => {
        if (obj.stroke !== undefined) {
          obj.set('stroke', brushColor);
        }
        if (obj.fill !== undefined && obj.fill !== 'transparent') {
          obj.set('fill', brushColor);
        }
      });
      canvas.renderAll();
    }
    
    // Set up more aggressive interval to enforce the brush color
    const colorEnforcerInterval = setInterval(() => {
      if (canvas.freeDrawingBrush) {
        if (canvas.freeDrawingBrush.color !== brushColor) {
          console.log('🎨 Enforcing brush color:', brushColor);
          canvas.freeDrawingBrush.color = brushColor;
          canvas.renderAll();
        }
      }
      
      // Also check any in-progress shape
      if (currentShapeRef.current) {
        if ((currentShapeRef.current as any).stroke !== brushColor) {
          (currentShapeRef.current as any).set('stroke', brushColor);
          canvas.renderAll();
        }
      }
    }, 500); // Check more frequently
    
    return () => clearInterval(colorEnforcerInterval);
  }, [brushColor, activeTool]);

  // Shape creation functions - use selected brush color
  const createShape = useCallback((startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, shapeType: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

    // Get current user for attribution only
    // Track drawing operation for multi-user sync
    
    // Ensure minimum size to prevent disappearing shapes
    const width = Math.max(5, Math.abs(endPoint.x - startPoint.x));
    const height = Math.max(5, Math.abs(endPoint.y - startPoint.y));
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);

    // Always use the brush color from Redux for stroke color
    const shapeOptions = {
      left,
      top,
      fill: 'transparent',
      stroke: brushColor, // ALWAYS use selected brush color
      strokeWidth: Math.max(2, brushSize / 3), // Increase minimum stroke width for visibility
      selectable: true,
      evented: true,
      perPixelTargetFind: true, // Better selection detection
      strokeUniform: true, // Maintain consistent stroke width
      objectCaching: true, // Improve rendering performance
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
        const radius = Math.max(5, Math.min(width, height) / 2); // Minimum radius of 5px
        shape = new fabric.Circle({
          ...shapeOptions,
          radius,
          left: left + width / 2 - radius,
          top: top + height / 2 - radius,
          strokeWidth: Math.max(2, brushSize / 3),
        });
        break;

      case 'triangle':
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

    // Add user attribution to shape
    if (shape && user) {
      (shape as any).createdBy = user?.id || 0;
      (shape as any).createdByName = user?.username || 'Unknown';
      (shape as any).createdByColor = '#007bff';
    }

    return shape;
  }, [brushSize, brushColor]);

  // Optimized mouse event handlers with performance improvements
  const handleMouseDown = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    // Update cursor position for cursor visualization
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.e.clientX - rect.left;
      const y = e.e.clientY - rect.top;
      // Always pass the container element to ensure cursor element is created/updated
      sendCursorPosition(x, y);
    }

    // Get current user
    // Current user from Redux: user
    if (!user) return;
    
    // ENFORCE the brush color is ALWAYS set correctly from Redux
    if (canvas.freeDrawingBrush) {
      // Double-check to make absolutely sure the color is set correctly
      if (canvas.freeDrawingBrush.color !== brushColor) {
        console.log('🔄 Correcting brush color on mouse down:', brushColor);
        canvas.freeDrawingBrush.color = brushColor;
      }
      
      // Also ensure brush width is correct
      canvas.freeDrawingBrush.width = brushSize;
    }

    // Handle different tools with minimal processing
    switch (activeTool) {
      case 'text':
        // Create text object at click position with selected color
        const text = new fabric.IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Arial',
          fontSize: Math.max(14, brushSize * 2),
          fill: brushColor, // Use selected color, NOT user's color
          selectable: true,
          evented: true,
          backgroundColor: 'rgba(255,255,255,0.8)', // Add background for better visibility
          padding: 5,
          stroke: '', // No stroke for text
          strokeWidth: 0,
        });
        
        // Add user attribution
        (text as any).createdBy = user?.id || 0;
        (text as any).createdByName = user?.username || 'Unknown';
        (text as any).createdByColor = '#007bff';
        
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
  }, [activeTool, brushSize, sendCursorPosition]);

  const handleMouseMove = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    // Update cursor position for cursor visualization
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.e.clientX - rect.left;
      const y = e.e.clientY - rect.top;
      // Always pass the container element to ensure cursor element is created/updated
      sendCursorPosition(x, y);
    }

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
  }, [activeTool, sendCursorPosition, createShape]);

  const handleMouseUp = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);
    
    // Update cursor position on mouse up
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.e.clientX - rect.left;
      const y = e.e.clientY - rect.top;
      sendCursorPosition(x, y);
    }

    if (activeTool === 'pan') {
      // Stop panning
      panStateRef.current.isDragging = false;
      canvas.selection = true;
    } else if (isDrawingShapeRef.current && shapeStartPointRef.current) {
      // Finalize shape creation
      if (currentShapeRef.current) {
        // Remove the preview shape
        canvas.remove(currentShapeRef.current);
        canvas.renderAll();
      }

      // Get distance between start and end points to check for accidental clicks
      const dx = pointer.x - shapeStartPointRef.current.x;
      const dy = pointer.y - shapeStartPointRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only create shape if it has reasonable size (prevents tiny invisible shapes)
      if (distance > 5) {
        const shape = createShape(shapeStartPointRef.current, pointer, activeTool);
        if (shape) {
          console.log('✅ Creating final shape:', activeTool);
          shape.selectable = true;
          shape.evented = true;
          shape.opacity = 1;
          
          // Ensure stroke color is set correctly
          if (shape.stroke !== undefined) {
            shape.set('stroke', brushColor);
          }
          
          // Add and select the shape
          canvas.add(shape);
          canvas.setActiveObject(shape);
          canvas.renderAll();
          
          // Save after shape creation
          debouncedSave();
        }
      } else {
        console.log('⚠️ Shape too small, not creating');
      }

      // Reset shape drawing state
      isDrawingShapeRef.current = false;
      shapeStartPointRef.current = null;
      currentShapeRef.current = null;
    }
  }, [activeTool, createShape]);

  // Enhanced debounced save function with object count verification
  const debouncedSave = useCallback(() => {
    if (isLoadingStateRef.current) {
      console.log('🛑 CursorsOnly: Skipping save - currently loading state');
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isLoadingStateRef.current) {
        console.log('🛑 CursorsOnly: Save cancelled - no canvas or loading state');
        return;
      }
      
      // Verify there are objects to save
      const objectCount = canvas.getObjects().length;
      
      // Get canvas state as JSON
      const canvasState = canvas.toJSON(['hasControls', 'hasBorders', 'selectable', 'evented']);
      console.log(`💾 CursorsOnly: Auto-saving canvas state for room ${roomId}... (${objectCount} objects)`);
      
      // Perform validation checks before saving
      if (objectCount === 0 && currentCanvas?.state && JSON.parse(JSON.stringify(currentCanvas.state)).objects?.length > 0) {
        // If we're about to save an empty canvas but we previously had objects, something might be wrong
        console.warn('⚠️ CursorsOnly: Preventing save of empty canvas when previous state had objects');
        return;
      }
      
      // Only save if we have a valid current canvas context
      if (currentCanvas && currentCanvas.roomId === roomId) {
        dispatch(saveCanvasState({
          roomId,
          state: canvasState
        }));
      } else {
        console.warn(`⚠️ CursorsOnly: Skipping save - room mismatch (current: ${currentCanvas?.roomId}, expected: ${roomId})`);
      }
    }, 3000); // Reduced to 3 seconds to save more frequently
  }, [roomId, dispatch, currentCanvas]);

  // Load canvas state from database using singleton room loading manager
  const loadCanvasState = useCallback(async () => {
    console.log('� CursorsOnly: Starting loadCanvasState for room:', roomId);
    
    try {
      await roomLoadingManager.loadRoom(roomId, async () => {
        console.log('� CursorsOnly: Loading canvas state and history for room:', roomId);
        
        // Clear operations first to reset state
        dispatch(clearOperations());
        
        // Fetch canvas and history in parallel for better performance
        await Promise.all([
          dispatch(fetchCanvas(roomId)),
          dispatch(fetchCanvasHistory({ roomId }))
        ]);
        
        console.log('✅ CursorsOnly: Canvas and history loaded for room:', roomId);
        
        // Apply enhanced canvas settings after data is loaded
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          canvas.renderOnAddRemove = true; // Re-enable auto-rendering
          canvas.perPixelTargetFind = true; // Better selection behavior
          canvas.targetFindTolerance = 5;   // More forgiving targeting
          canvas.centeredScaling = true;    // Better scaling behavior
          canvas.snapAngle = 15;            // Snap rotation to 15 degree increments
          canvas.stopContextMenu = true;    // Prevent context menu on right-click
          canvas.renderAll(); // Render with new settings
        }
        
        // Set canvas loading to false after data is loaded
        setIsCanvasLoading(false);
      });
    } catch (error) {
      console.error('❌ CursorsOnly: Failed to load canvas state:', error);
      // Still hide loading on error
      setIsCanvasLoading(false);
    }
  }, [roomId, dispatch]);

  // Clear canvas when room changes to fix cross-room sharing - MOVED HERE
  useEffect(() => {
    if (currentRoomIdRef.current !== null && currentRoomIdRef.current !== roomId) {
      console.log(`🧹 CursorsOnly: Room changed from ${currentRoomIdRef.current} to ${roomId}, clearing canvas`);
      
      // Cancel any ongoing room loading for the previous room
      roomLoadingManager.cancelRoomLoading(currentRoomIdRef.current);
      
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
      
      // Clear Redux operations immediately for room isolation
      dispatch(clearOperations());
      
      // Disconnect existing socket to prevent cross-room events
      if (socketRef.current) {
        console.log('🔌 CursorsOnly: Disconnecting old socket for room change');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
    currentRoomIdRef.current = roomId;
    
    // Note: Canvas state loading is now handled by the socket connection useEffect
  }, [roomId, dispatch]); // Removed loadCanvasState from dependencies to prevent infinite loop

  // Stable event handlers using useCallback
    const handlePathCreated = useCallback((e: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isLoadingStateRef.current) {
        console.log('🛑 CursorsOnly: Skipping path creation - loading state');
        return;
      }

      // Get current user for attribution
      // Current user from Redux: user
      if (!user) return;

      console.log('✏️ CursorsOnly: Path created by', user?.username || 'Unknown');
      
      // FORCE selected brush color, not user color
      if (e.path) {
        // Apply color and make sure path is visible
        e.path.set({
          stroke: brushColor,
          fill: 'transparent',
          strokeWidth: Math.max(1, brushSize), // Ensure stroke is visible
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          strokeMiterLimit: 10,
        });      // Add user attribution to path
      (e.path as any).createdBy = user?.id || 0;
      (e.path as any).createdByName = user?.username || 'Unknown';
      (e.path as any).createdByColor = '#007bff';
    }

    // Create operation for socket transmission and Redux
    const operation = {
      objectType: 'path',
      objectData: {
        pathData: e.path?.toJSON() || {},
        timestamp: Date.now(),
        createdBy: user?.id || 0,
        createdByName: user?.username || 'Unknown',
        createdByColor: '#007bff'
      },
      action: 'added'
    };

    // Dispatch to Redux with proper room isolation and user attribution
    dispatch(addOperation({
      id: Date.now(),
      objectType: 'path',
      objectData: operation.objectData,
      action: 'added',
      createdAt: new Date().toISOString(),
      canvasId: currentCanvas?.id || roomId,
      userId: parseInt(user?.id || 0, 10) || 0 // Use current user ID (converted to number)
    }));

    // Emit via socket
    if (socketRef.current?.isConnected()) {
      console.log('🚀 CursorsOnly: Emitting drawing operation for', user?.username || 'Unknown');
      socketRef.current.emitDrawingOperation(operation);
    }

    // Auto-save canvas state to database (debounced)
    debouncedSave();
  }, [roomId, dispatch, debouncedSave]);

  const handleObjectAdded = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;
    
    // Get current user for attribution (if not already set)
    // Current user from Redux: user
    if (!user) return;
    
    const obj = e.target;
    if (obj && !(obj as any).createdBy) {
      console.log(`➕ CursorsOnly: Object added by ${user?.username || 'Unknown'} (${obj?.type})`);
      
      // Add user attribution if not already present
      (obj as any).createdBy = user?.id || 0;
      (obj as any).createdByName = user?.username || 'Unknown';
      (obj as any).createdByColor = '#007bff';
      
      // Keep the object's current color (from brushColor) - don't override with user color
      // We still attribute the object to the user, but the color stays as selected
      // No need to change the object's appearance here

      canvas.requestRenderAll();
    }
    
    // Auto-save after object addition (debounced)
    debouncedSave();
  }, [debouncedSave]);

  const handleObjectRemoved = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;
    
    // Current user from Redux: user
    if (!user) return;
    
    console.log(`🗑️ CursorsOnly: Object removed by ${user?.username || 'Unknown'}`);
    
    // Auto-save after object removal (debounced)
    debouncedSave();
  }, [debouncedSave]);

  // Monitor shape modifications to maintain consistency
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Function to handle shape modifications
    const handleObjectModified = (e: any) => {
      const obj = e.target;
      if (!obj) return;
      
      // Make sure the object remains visible
      if (obj.strokeWidth !== undefined && obj.strokeWidth < 1) {
        obj.set('strokeWidth', Math.max(1, brushSize / 5));
      }
      
      // Save after modification
      debouncedSave();
    };
    
    // Listen for object modifications
    canvas.on('object:modified', handleObjectModified);
    
    return () => {
      canvas.off('object:modified', handleObjectModified);
    };
  }, [debouncedSave, brushSize]);
  
  // Canvas initialization - ONLY ONCE
  useEffect(() => {
    if (isInitializedRef.current || !canvasRef.current) return;
    
    console.log('🎨 CursorsOnly: Initializing canvas (one-time only)');
    
    // Create canvas instance with minimal essential settings for faster initialization
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      isDrawingMode: !readOnly,
      selection: !readOnly,
      renderOnAddRemove: false, // Optimize: disable auto-render during bulk operations
      skipTargetFind: false,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    isInitializedRef.current = true;

    // Configure brush with proper settings from the start
    if (canvas.freeDrawingBrush) {
      // Initialize with the selected brush color, NEVER default black
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushSize;
      // Set round line caps for smoother drawing
      canvas.freeDrawingBrush.strokeLineCap = 'round';
      canvas.freeDrawingBrush.strokeLineJoin = 'round';
    }

    // Apply initial tool settings
    applyToolSettings();

    // Log canvas operations for debugging (non-intrusive)
    console.log('🎨 CursorsOnly: Canvas ready with dimensions:', { width, height });

    // Create handler for object selection to sync with Redux color
    const handleObjectSelected = (e: any) => {
      if (activeTool === 'select' && e.target) {
        // When selecting an object, we can optionally update the selected color
        // to match the object's color for a consistent experience
        const obj = e.target;
        if (obj.stroke && obj.stroke !== 'transparent' && obj.stroke !== '') {
          // Just log it for now, don't automatically change the color
          console.log('💭 Selected object with color:', obj.stroke);
        }
      }
    };

    // Attach stable event handlers
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    
    // Attach mouse event handlers for shape creation and interaction
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    console.log('✅ CursorsOnly: Canvas initialization complete');
    // Note: Canvas loading state will be set to false after data loading completes

    // Note: Canvas state loading is now handled by the socket connection useEffect
    // This ensures loading happens only after socket is connected

    // Cleanup function
    return () => {
      console.log('🧹 CursorsOnly: Component unmounting, disposing canvas');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Clean up refs
      isInitializedRef.current = false;
      lastRestoredStateRef.current = null;
      isLoadingStateRef.current = false;
      
      // Clean up cursor resources
      // Cursor cleanup handled in effect;
      
      // Dispose canvas
      canvas.dispose();
    };
  }, [width, height, readOnly, applyToolSettings, handlePathCreated, handleObjectAdded, handleObjectRemoved, handleMouseDown, handleMouseMove, handleMouseUp]); // Removed loadCanvasState from dependencies

  // State to manage connection status  
  const [isLoading, setIsLoading] = useState(true);
  
  // Use a ref to store connection state that doesn't trigger re-renders
  const connectionManager = useRef({ 
    isInitializing: false,
    currentRoomId: null as number | null,
    userId: null as number | null
  });

  // Single useEffect for entire socket connection lifecycle
  useEffect(() => {
    console.log(`🔍 CursorsOnly: Socket useEffect triggered for room ${roomId}, userId: ${userId}, readOnly: ${readOnly}`);
    
    // Prevent re-running if already initializing or if missing required data
    if (connectionManager.current.isInitializing || !isUserReady || readOnly) {
      console.log(`🛑 CursorsOnly: Skipping socket init - initializing: ${connectionManager.current.isInitializing}, userReady: ${isUserReady}, readOnly: ${readOnly}`);
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🛑 CursorsOnly: No token found, skipping socket init');
      setIsLoading(false);
      return;
    }

    // Check if we're already connected to this room with the same user
    if (connectionManager.current.currentRoomId === roomId && 
        socketRef.current?.isConnected() && 
        connectionManager.current.userId === userId) {
      console.log(`🔌 CursorsOnly: Already connected to room ${roomId} with user ${userId}`);
      setIsLoading(false);
      return;
    }

    console.log(`🔌 CursorsOnly: Initializing stable socket connection for room ${roomId}`);
    connectionManager.current.isInitializing = true;
    
    // Clean up any existing connection
    if (socketRef.current) {
      console.log('🧹 CursorsOnly: Cleaning up previous socket connection');
      socketRef.current.disconnect();
    }

    // Create socket (the socket service handles all event listeners internally)
    socketRef.current = createCanvasSocket({
      url: socketUrl,
      roomId,
      userId: userId!,
      token,
      dispatch,
    });

    // Connect and wait for socket to be ready
    socketRef.current.connect();
    
    // Add cursor event listeners following the best practice pattern
    const socket = socketRef.current.socket;
    if (socket) {
      // Listen for cursor updates from OTHER users
      socket.on('updateCursor', (data: { userId: number; position: { x: number; y: number } }) => {
        if (!containerRef.current) return;
        
        const { userId: senderUserId, position } = data;
        const userKey = `user-${senderUserId}`;
        
        // Check if we already have a cursor for this user
        if (!otherCursorsRef.current[userKey]) {
          // Create a new cursor element for this user
          const newCursor = document.createElement('div');
          newCursor.className = 'other-user-cursor';
          newCursor.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 9999;
            transform: translate(-50%, -50%);
            display: ${showCursors ? 'block' : 'none'};
          `;
          
          // Create cursor icon
          const icon = document.createElement('div');
          icon.textContent = '🔴';
          icon.style.cssText = `
            font-size: 16px;
            text-shadow: 0 0 3px #dc3545;
          `;
          
          // Create user label
          const label = document.createElement('div');
          label.textContent = `User ${senderUserId}`;
          label.style.cssText = `
            background: #dc3545;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            margin-top: 12px;
            white-space: nowrap;
          `;
          
          newCursor.appendChild(icon);
          newCursor.appendChild(label);
          containerRef.current.appendChild(newCursor);
          otherCursorsRef.current[userKey] = newCursor;
        }
        
        // Update cursor position
        const cursor = otherCursorsRef.current[userKey];
        cursor.style.left = `${position.x}px`;
        cursor.style.top = `${position.y}px`;
      });
      
      // Listen for users who disconnect and remove their cursors
      socket.on('removeCursor', (userId: number) => {
        const userKey = `user-${userId}`;
        if (otherCursorsRef.current[userKey]) {
          otherCursorsRef.current[userKey].remove();
          delete otherCursorsRef.current[userKey];
        }
      });
    }
    
    // Wait for socket connection to establish before loading data
    let connectionAttempts = 0;
    const maxAttempts = 50; // 5 seconds total (50 * 100ms)
    
    const waitForConnection = () => {
      connectionAttempts++;
      
      if (socketRef.current?.isConnected()) {
        console.log(`✅ CursorsOnly: Socket connected to room ${roomId} after ${connectionAttempts * 100}ms, loading canvas state`);
        setIsLoading(false);
        connectionManager.current.isInitializing = false;
        connectionManager.current.currentRoomId = roomId;
        connectionManager.current.userId = userId!;
        
        // Load canvas state after confirmed connection
        loadCanvasState();
      } else if (connectionAttempts < maxAttempts) {
        // Retry connection check after a short delay
        setTimeout(waitForConnection, 100);
      } else {
        console.error('❌ CursorsOnly: Socket connection timeout after 5 seconds');
        // Still try to load canvas state even if socket fails
        setIsLoading(false);
        connectionManager.current.isInitializing = false;
        loadCanvasState();
      }
    };
    
    // Start connection polling
    setTimeout(waitForConnection, 100);

    // Cleanup function - runs only when component unmounts or roomId changes
    return () => {
      console.log(`🧹 CursorsOnly: Cleaning up socket for room ${roomId}`);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      connectionManager.current.isInitializing = false;
      connectionManager.current.currentRoomId = null;
      connectionManager.current.userId = null;
      // Reset loading state when switching rooms
      setIsCanvasLoading(true);
    };
  }, [roomId, userId, readOnly]); // Use stable userId reference

  // Canvas state restoration from database - ENHANCED STABILITY VERSION  
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentCanvas?.state || isLoadingStateRef.current) {
      return;
    }
    
    // Prevent restoring the same state multiple times
    const stateString = JSON.stringify(currentCanvas.state);
    if (lastRestoredStateRef.current === stateString) {
      console.log('🛑 CursorsOnly: State already restored, skipping');
      return;
    }

    console.log('📥 CursorsOnly: Restoring canvas state from database...');
    isLoadingStateRef.current = true;
    lastRestoredStateRef.current = stateString;
    
    try {
      // Temporarily disable ALL event handlers during loading
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      
      // First clear the canvas to prevent duplication
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      
      canvas.loadFromJSON(currentCanvas.state, () => {
        const objectCount = canvas.getObjects().length;
        console.log(`✅ CursorsOnly: Canvas state restored! Objects: ${objectCount}`);
        
        // Process objects to ensure they have proper visibility
        const objects = canvas.getObjects();
        objects.forEach(obj => {
          // Ensure minimum stroke width for all objects for visibility
          if (obj.strokeWidth !== undefined && obj.strokeWidth < 1) {
            obj.set('strokeWidth', Math.max(2, brushSize / 3));
          }
          
          // Ensure stroke color is visible
          if (obj.stroke !== undefined && (!obj.stroke || obj.stroke === 'transparent')) {
            obj.set('stroke', brushColor);
          }
          
          // Make sure text objects are visible and properly configured
          if (obj.type === 'i-text' || obj.type === 'text') {
            obj.set({
              hasControls: true,
              hasBorders: true,
              selectable: true,
              evented: true
            });
            
            // Add background for better visibility if needed
            if (!(obj as any).backgroundColor) {
              (obj as any).set('backgroundColor', 'rgba(255,255,255,0.5)');
            }
          }
          
          // Fix any path objects with visibility issues
          if (obj.type === 'path') {
            if (!(obj as any).strokeWidth || (obj as any).strokeWidth < 1) {
              (obj as any).set('strokeWidth', Math.max(1, brushSize));
            }
          }
        });
        
        // Re-enable event handlers after a short delay
        setTimeout(() => {
          canvas.on('path:created', handlePathCreated);
          canvas.on('object:added', handleObjectAdded);
          canvas.on('object:removed', handleObjectRemoved);
          isLoadingStateRef.current = false;
          
          // Apply tool settings after state restoration
          applyToolSettings();
          
          // Force a full render with all fixes applied
          canvas.renderAll();
        }, 200);
      });
    } catch (error) {
      console.error('❌ CursorsOnly: Failed to restore canvas state:', error);
      
      // Re-enable event handlers even on error
      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);
      canvas.on('object:removed', handleObjectRemoved);
      isLoadingStateRef.current = false;
      lastRestoredStateRef.current = null; // Allow retry
    }
  }, [currentCanvas?.state, handlePathCreated, handleObjectAdded, handleObjectRemoved, applyToolSettings]);

  // Handle cursor tracking in the container
  // Mouse move handler for the container to send our cursor position
  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Send our cursor position to other users via socket
    sendCursorPosition(x, y);
  }, [sendCursorPosition]);
  
  // Cleanup cursors when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all cursor elements
      Object.values(otherCursorsRef.current).forEach(cursor => cursor.remove());
      otherCursorsRef.current = {};
    };
  }, []);

  // Component cleanup - cancel loading when unmounting
  useEffect(() => {
    return () => {
      if (roomId) {
        console.log('🧹 CursorsOnly: Component unmounting, cancelling room loading for:', roomId);
        roomLoadingManager.cancelRoomLoading(roomId);
      }
    };
  }, [roomId]);

  const toggleCursorDisplay = () => {
    setIsCursorDisplayVisible(!isCursorDisplayVisible);
  };

  // Clear canvas handler
  const handleClearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || readOnly) return;

    console.log('🧹 CursorsOnly: Manual clear requested');
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    
    // Auto-save after clearing
    debouncedSave();
  };

  // Get current user for display
  // Current user from Redux: user

  // Show loading state while canvas is initializing
  if (isCanvasLoading) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Canvas...</p>
          <p className="text-gray-400 text-sm mt-1">Connecting to room and loading data</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-white"
      onMouseMove={handleContainerMouseMove}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Toolbar with Current User Info */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        {/* Left section: Current user info */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleCursorDisplay}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white shadow-sm border border-gray-300"
          >
            <span className="text-lg">{user?.cursorIcon}</span>
            <span className="font-medium" style={{ color: user?.color }}>
              {user?.name}
            </span>
            <span className="text-xs text-gray-500">
              {isCursorDisplayVisible ? '▼' : '▶'}
            </span>
          </button>
          
          <div className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
            <span>Cursor Display</span>
            <span className={`ml-2 w-2 h-2 rounded-full ${showCursors ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
          
          <div className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
            <span>Socket</span>
            <span className={`ml-2 w-2 h-2 rounded-full ${socketRef.current?.isConnected() ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
        </div>

        {/* Right section: Tool info */}
        <div className="flex items-center space-x-3 text-sm text-gray-600">
          <div className="px-2 py-1 bg-gray-100 rounded-md">
            Tool: {activeTool}
          </div>
          <button
            onClick={handleClearCanvas}
            className="px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Cursor Toggle Button */}
      <button
        onClick={toggleShowCursors}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          showCursors 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        title={showCursors ? 'Hide cursors' : 'Show cursors'}
      >
        👁️ {showCursors ? 'Hide' : 'Show'} Cursors
      </button>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          className="w-full h-full"
        />
      </div>

      {/* Bottom status bar */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <div>
          Room #{roomId} | Objects: {fabricCanvasRef.current?.getObjects().length || 0}
        </div>
        <div>
          Press C to toggle cursor visibility
        </div>
      </div>
    </div>
  );
};

export default CursorsOnlyFigmaCanvas;

