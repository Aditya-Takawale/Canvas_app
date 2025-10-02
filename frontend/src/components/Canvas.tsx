import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Socket } from 'socket.io-client';
import { createCanvasSocket } from '../services/socket';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { saveCanvasState, addOperation } from '../store/slices/canvasSlice';
import { DrawingOperation } from '../interfaces/room';

interface CanvasProps {
  roomId: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

enum DrawingTools {
  SELECT = 'SELECT',
  PENCIL = 'PENCIL',
  LINE = 'LINE',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  TEXT = 'TEXT',
  STICKY = 'STICKY',
  ARROW = 'ARROW',
  ERASER = 'ERASER',
  PAN = 'PAN',
  ZOOM = 'ZOOM',
}

// Note colors for sticky notes
const NOTE_COLORS = {
  YELLOW: '#FFF9C4',
  BLUE: '#BBDEFB',
  GREEN: '#C8E6C9',
  PINK: '#F8BBD0',
  PURPLE: '#E1BEE7',
  ORANGE: '#FFE0B2',
}

const CanvasComponent: React.FC<CanvasProps> = ({ 
  roomId, 
  width = 800, 
  height = 600, 
  readOnly = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const socketRef = useRef<ReturnType<typeof createCanvasSocket> | null>(null);
  
  const dispatch = useAppDispatch();
  const { currentCanvas, activeUsers, operations } = useAppSelector(state => state.canvas);
  const { user } = useAppSelector(state => state.auth);
  
  const [currentTool, setCurrentTool] = useState<DrawingTools>(DrawingTools.PENCIL);
  const [color, setColor] = useState<string>('#000000');
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [strokeStyle, setStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [opacity, setOpacity] = useState<number>(1);
  const [brushSize, setBrushSize] = useState<number>(5);
  const [arrowHeadEnd, setArrowHeadEnd] = useState<boolean>(true);
  const [arrowHeadStart, setArrowHeadStart] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const drawingShapeRef = useRef<fabric.Object | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  // Refs to avoid stale values in pointer handlers
  const toolRef = useRef(currentTool);
  const colorRef = useRef(color);
  const fillColorRef = useRef(fillColor);
  const strokeStyleRef = useRef(strokeStyle);
  const opacityRef = useRef(opacity);
  const brushSizeRef = useRef(brushSize);
  const arrowHeadStartRef = useRef(arrowHeadStart);
  const arrowHeadEndRef = useRef(arrowHeadEnd);
  const isRedrawingRef = useRef(false); // Flag to prevent infinite loops during redraw
  const isLocalOperationRef = useRef(false); // Flag to track if we're processing our own operation

  useEffect(() => { toolRef.current = currentTool; }, [currentTool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { fillColorRef.current = fillColor; }, [fillColor]);
  useEffect(() => { strokeStyleRef.current = strokeStyle; }, [strokeStyle]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { arrowHeadStartRef.current = arrowHeadStart; }, [arrowHeadStart]);
  useEffect(() => { arrowHeadEndRef.current = arrowHeadEnd; }, [arrowHeadEnd]);
  
  // Initialize the fabric canvas - STABLE LIKE MinimalCanvas
  useEffect(() => {
    console.log('🎨 Canvas initialization (stable pattern)', { 
      hasCanvasRef: !!canvasRef.current, 
      hasFabricCanvas: !!fabricCanvasRef.current,
      width, 
      height 
    });
    
    if (canvasRef.current && !fabricCanvasRef.current) {
      console.log('🎨 Creating fabric canvas...');
      try {
        fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
          isDrawingMode: currentTool === DrawingTools.PENCIL,
          selection: !readOnly && currentTool === DrawingTools.SELECT,
        });
        
        const canvas = fabricCanvasRef.current;
        console.log('Fabric canvas created:', canvas);
        
        // Load existing canvas state if available
        if (currentCanvas?.state) {
          console.log('Loading existing canvas state:', currentCanvas.state);
          canvas.loadFromJSON(currentCanvas.state, canvas.renderAll.bind(canvas));
        } else {
          console.log('No existing canvas state to load - starting with blank canvas');
        }
        
        // Set up canvas event listeners
        canvas.on('object:added', handleObjectAdded);
        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:removed', handleObjectRemoved);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('path:created', handlePathCreated);

        // Pointer-based drawing for LINE and ARROW tools
        const downHandler = (opt: fabric.IEvent) => {
          if (readOnly || !opt.pointer) return;
          if (toolRef.current !== DrawingTools.LINE && toolRef.current !== DrawingTools.ARROW) return;
          const { x, y } = opt.pointer;
          startPointRef.current = { x, y };
          setIsDrawing(true);

          if (toolRef.current === DrawingTools.LINE) {
            const line = new fabric.Line([x, y, x, y], {
              stroke: colorRef.current,
              strokeWidth: brushSizeRef.current,
              selectable: true,
              evented: true,
              opacity: opacityRef.current,
              strokeDashArray: strokeStyleRef.current === 'dashed' ? [8, 4] : strokeStyleRef.current === 'dotted' ? [2, 4] : undefined,
            });
            applyCommonObjectProps(line);
            canvas.add(line);
            drawingShapeRef.current = line;
          } else if (toolRef.current === DrawingTools.ARROW) {
            // Create base line
            const line = new fabric.Line([x, y, x, y], {
              stroke: colorRef.current,
              strokeWidth: brushSizeRef.current,
              selectable: false,
              evented: false,
              opacity: opacityRef.current,
              strokeDashArray: strokeStyleRef.current === 'dashed' ? [8, 4] : strokeStyleRef.current === 'dotted' ? [2, 4] : undefined,
            });
            // Arrowhead(s)
            const triangleEnd = new fabric.Triangle({ width: 10 + brushSizeRef.current, height: 10 + brushSizeRef.current, fill: colorRef.current, originX: 'center', originY: 'center' });
            const triangleStart = new fabric.Triangle({ width: 10 + brushSizeRef.current, height: 10 + brushSizeRef.current, fill: colorRef.current, originX: 'center', originY: 'center' });
            const groupMembers: fabric.Object[] = [line];
            if (arrowHeadEndRef.current) groupMembers.push(triangleEnd);
            if (arrowHeadStartRef.current) groupMembers.push(triangleStart);
            const arrow = new fabric.Group(groupMembers, { selectable: true, evented: true, opacity: opacityRef.current });
            applyCommonObjectProps(arrow);
            canvas.add(arrow);
            drawingShapeRef.current = arrow;
          }
        };

        const moveHandler = (opt: fabric.IEvent) => {
          if (!isDrawing || !startPointRef.current || !opt.pointer) return;
          if (toolRef.current !== DrawingTools.LINE && toolRef.current !== DrawingTools.ARROW) return;
          const { x, y } = opt.pointer;
          const start = startPointRef.current;
          if (drawingShapeRef.current instanceof fabric.Line) {
            const line = drawingShapeRef.current as fabric.Line;
            line.set({ x2: x, y2: y });
            canvas.requestRenderAll();
          } else if (drawingShapeRef.current instanceof fabric.Group) {
            const group = drawingShapeRef.current as fabric.Group;
            const objs = group.getObjects();
            const line = objs.find(o => o.type === 'line') as fabric.Line;
            if (line) {
              line.set({ x1: start.x, y1: start.y, x2: x, y2: y });
            }
            // Position arrowheads
            const angle = Math.atan2(y - start.y, x - start.x) * 180 / Math.PI;
            const triEnd = objs.find(o => o.type === 'triangle' && arrowHeadEndRef.current) as fabric.Triangle;
            const triStart = objs.length > 2 ? objs.find(o => o.type === 'triangle' && arrowHeadStartRef.current) as fabric.Triangle : undefined;
            if (triEnd) {
              triEnd.set({ left: x, top: y, angle: angle + 90 });
            }
            if (triStart) {
              triStart.set({ left: start.x, top: start.y, angle: angle - 90 });
            }
            group.addWithUpdate();
            canvas.requestRenderAll();
          }
        };

        const upHandler = () => {
          if (!isDrawing) return;
          setIsDrawing(false);
          startPointRef.current = null;
          drawingShapeRef.current = null;
        };

        canvas.on('mouse:down', downHandler);
        canvas.on('mouse:move', moveHandler);
        canvas.on('mouse:up', upHandler);

        // Store for cleanup
        (canvas as any).__customHandlers = { downHandler, moveHandler, upHandler };
        
        console.log('Canvas initialization complete - using MinimalCanvas stable pattern');
      } catch (error) {
        console.error('Error initializing fabric canvas:', error);
      }
    }
    
    // NO CLEANUP to match MinimalCanvas stability - let canvas persist
    
  }, [width, height]); // Only depend on size, not on changing objects
  
  // Update canvas tool settings when tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    canvas.isDrawingMode = currentTool === DrawingTools.PENCIL;
    canvas.selection = !readOnly && currentTool === DrawingTools.SELECT;
    
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [currentTool, color, brushSize, readOnly]);
  
  // Initialize socket connection
  useEffect(() => {
    if (!user || readOnly) return;
    
    // Get token from localStorage if available
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
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
      }
    };
  }, [roomId, user, readOnly]);
  
  // Save canvas state periodically
  useEffect(() => {
    if (readOnly || !fabricCanvasRef.current) return;
    
    console.log('⚠️ AUTO-SAVE TEMPORARILY DISABLED FOR DEBUGGING');
    return; // Early return to disable auto-save
    
    const saveInterval = setInterval(() => {
      handleSaveCanvasState();
    }, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(saveInterval);
    };
  }, [fabricCanvasRef.current, readOnly]);

  // Apply incoming operations from Redux to the canvas
  const lastOperationCountRef = useRef(0);
  
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const prevCount = lastOperationCountRef.current;
    const currCount = operations.length;
    // Initial load or after clear: full redraw of all operations
    if (prevCount === 0 && currCount > 0) {
      console.log('� Initial operations load - performing full redraw');
      redrawCanvasFromOperations();
    }
    // Update operation count reference
    lastOperationCountRef.current = currCount;
  }, [operations]);

  // Incremental update for remote operations - DISABLED FOR LOCAL TESTING
  useEffect(() => {
    console.log('⚠️ Remote operations useEffect disabled for local testing');
    return;
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (operations.length === 0) return;
    const lastOp = operations[operations.length - 1];
    // Skip local operations
    if (lastOp.userId === user?.id) return;
    try {
      const data = typeof lastOp.objectData === 'string' ? JSON.parse(lastOp.objectData) : lastOp.objectData;
      console.log('🔄 Applying remote operation:', lastOp);
      if (lastOp.action === 'added') {
        let obj: fabric.Object;
        switch (data.type) {
          case 'path': obj = new fabric.Path(data.path, { ...data, selectable: !readOnly }); break;
          case 'rect': obj = new fabric.Rect(data); break;
          case 'circle': obj = new fabric.Circle(data); break;
          case 'line': obj = new fabric.Line(data.coords || [0,0,0,0], data); break;
          case 'i-text': obj = new fabric.IText(data.text || '', data); break;
          case 'group': obj = new fabric.Group([], data); break;
          default:
            console.log('Unsupported remote object type:', data.type);
            return;
        }
        canvas.add(obj);
        canvas.renderAll();
      } else if (lastOp.action === 'removed') {
        // optional: implement removal logic
      }
    } catch (error) {
      console.error('Error applying remote operation:', error);
    }
  }, [operations]);

  // Function to completely redraw the canvas from all operations
  const redrawCanvasFromOperations = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isRedrawingRef.current) return; // Prevent recursive calls
    
    console.log('Redrawing canvas from operations. Total operations:', operations.length);
    console.log('📋 Operations array:', operations);
    
    // Set flag to prevent event handlers from dispatching during redraw
    isRedrawingRef.current = true;
    
    // Monitor for any unexpected canvas clear calls
    const originalClear = canvas.clear;
    canvas.clear = function(...args) {
      console.error('🚨 CANVAS.CLEAR() CALLED!', new Error().stack);
      return originalClear.apply(this, args);
    };
    
    // Clear the canvas completely (this one is expected)
    console.log('🧹 Intentionally clearing canvas for redraw');
    originalClear.call(canvas);
    
    // Apply all operations in order to rebuild the canvas
    operations.forEach((operation: DrawingOperation, index: number) => {
      try {
        const objectData = typeof operation.objectData === 'string' 
          ? JSON.parse(operation.objectData) 
          : operation.objectData;
          
        console.log(`🔍 Operation ${index + 1} data:`, { 
          operationType: operation.objectType, 
          action: operation.action,
          objectDataType: objectData?.type,
          hasPath: !!objectData?.path,
          objectData: objectData
        });
          
        if (operation.action === 'added') {  // Changed from 'add' to 'added'
          console.log(`✏️ Redrawing operation ${index + 1}:`, operation.objectType);
          
          // Create the fabric object from the serialized data
          if (objectData.type === 'path') {
            // Handle path objects (pencil drawings) - use loadFromJSON approach
            console.log('🎨 Creating path from data:', objectData);
            try {
              const path = new fabric.Path(objectData.path, {
                ...objectData,
                selectable: !readOnly
              });
              canvas.add(path);
              console.log('✅ Path object added to canvas');
            } catch (error) {
              console.error('❌ Failed to create path object:', error);
            }
          } else if (objectData.type === 'rect') {
            // Handle rectangle objects
            const rect = new fabric.Rect(objectData);
            canvas.add(rect);
          } else if (objectData.type === 'circle') {
            // Handle circle objects
            const circle = new fabric.Circle(objectData);
            canvas.add(circle);
          } else if (objectData.type === 'line') {
            // Handle line objects
            const line = new fabric.Line(objectData.coords || [0,0,0,0], objectData);
            canvas.add(line);
          } else if (objectData.type === 'i-text') {
            // Handle text objects
            const text = new fabric.IText(objectData.text || '', objectData);
            canvas.add(text);
          } else if (objectData.type === 'group') {
            // Handle grouped objects (like sticky notes) - simplified approach
            const group = new fabric.Group([], objectData);
            canvas.add(group);
          } else {
            // For other types, try to create a generic object
            console.log('Generic object type:', objectData.type);
          }
        }
      } catch (error) {
        console.error('Error redrawing operation:', error, operation);
      }
    });
    
    // Final render
    canvas.renderAll();
    
    // Clear the redrawing flag
    isRedrawingRef.current = false;
    
    console.log('Canvas redraw completed. Objects on canvas:', canvas.getObjects().length);
    
    // Set up a timer to check if objects disappear
    setTimeout(() => {
      const objectsAfter = canvas.getObjects().length;
      console.log('🕐 Objects count 1 second after redraw:', objectsAfter);
      if (objectsAfter === 0) {
        console.error('❌ Objects disappeared after redraw! Something cleared the canvas.');
      }
    }, 1000);
    
    // Also check at 3 seconds and 5 seconds
    setTimeout(() => {
      const objectsAfter = canvas.getObjects().length;
      console.log('🕐 Objects count 3 seconds after redraw:', objectsAfter);
      if (objectsAfter === 0) {
        console.error('❌ Objects disappeared 3 seconds after redraw!');
      }
    }, 3000);
    
    setTimeout(() => {
      const objectsAfter = canvas.getObjects().length;
      console.log('🕐 Objects count 5 seconds after redraw:', objectsAfter);
      if (objectsAfter === 0) {
        console.error('❌ Objects disappeared 5 seconds after redraw!');
      }
    }, 5000);
  };
  
  // Event handlers for fabric canvas
  const handleObjectAdded = (e: fabric.IEvent) => {
    console.log('🎨 handleObjectAdded triggered!', { user: !!user, readOnly, hasTarget: !!e.target, socketConnected: socketRef.current?.isConnected() });
    // Prevent dispatching during canvas redraw to avoid infinite loops
    if (!user || readOnly || !e.target || isRedrawingRef.current) {
      console.log('❌ handleObjectAdded early return:', { user: !!user, readOnly, hasTarget: !!e.target, isRedrawing: isRedrawingRef.current });
      return;
    }
    
    const object = e.target;
    const objectType = object.type || 'unknown';
    
    // Skip path objects as they are handled by handlePathCreated
    if (objectType === 'path') return;
    
    const objectData = object.toJSON();
    
    const operation = {
      objectType,
      objectData,
      action: 'added',
    };
    
    // Send operation to the server via socket
    if (socketRef.current) {
      socketRef.current.emitDrawingOperation(operation);
    }
    
    // Add to local state
    dispatch(addOperation({
      id: Date.now(),
      objectType,
      objectData,
      action: 'added',
      createdAt: new Date().toISOString(),
      canvasId: currentCanvas?.id || 0,
      userId: user.id
    }));
  };
  
  // Handle path creation from free drawing (pencil tool)
  const handlePathCreated = (e: any) => {
    console.log('🎨 handlePathCreated triggered!', { user, readOnly, hasPath: !!e.path, socketConnected: socketRef.current?.isConnected() });
    // Prevent dispatching during canvas redraw to avoid infinite loops
    if (!user || readOnly || !e.path || isRedrawingRef.current) {
      console.log('❌ handlePathCreated early return:', { user: !!user, readOnly, hasPath: !!e.path, isRedrawing: isRedrawingRef.current });
      return;
    }
    
    // Set flag to indicate we're processing our own operation
    isLocalOperationRef.current = true;
    
    const path = e.path as fabric.Path;
    const objectType = 'path';
    const objectData = path.toJSON();
    console.log('📝 Creating path operation:', { objectType, hasObjectData: !!objectData });
    
    const operation = {
      objectType,
      objectData,
      action: 'added',
    };
    
    // Send operation to the server via socket
    if (socketRef.current) {
      console.log('🚀 Emitting drawing operation via socket:', operation);
      socketRef.current.emitDrawingOperation(operation);
    } else {
      console.error('❌ No socket connection available for path!');
    }
    
    // Add to local state
    dispatch(addOperation({
      id: Date.now(),
      objectType,
      objectData,
      action: 'added',
      createdAt: new Date().toISOString(),
      canvasId: currentCanvas?.id || 0,
      userId: user.id
    }));
    
    // Clear flag after a short delay
    setTimeout(() => {
      isLocalOperationRef.current = false;
    }, 100);
  };
  
  const handleObjectModified = (e: fabric.IEvent) => {
    // Prevent dispatching during canvas redraw to avoid infinite loops
    if (!user || readOnly || !e.target || isRedrawingRef.current) return;
    
    const object = e.target;
    const objectType = object.type || 'unknown';
    const objectData = object.toJSON();
    
    const operation = {
      objectType,
      objectData,
      action: 'modified',
    };
    
    // Send operation to the server via socket
    if (socketRef.current) {
      socketRef.current.emitDrawingOperation(operation);
    }
    
    // Add to local state
    dispatch(addOperation({
      id: Date.now(),
      objectType,
      objectData,
      action: 'modified',
      createdAt: new Date().toISOString(),
      canvasId: currentCanvas?.id || 0,
      userId: user.id
    }));
  };
  
  const handleObjectRemoved = (e: fabric.IEvent) => {
    console.log('🗑️ handleObjectRemoved triggered!', { 
      user: !!user, 
      readOnly, 
      hasTarget: !!e.target, 
      isRedrawing: isRedrawingRef.current,
      objectType: e.target?.type 
    });
    
    // Prevent dispatching during canvas redraw to avoid infinite loops
    if (!user || readOnly || !e.target || isRedrawingRef.current) {
      console.log('❌ handleObjectRemoved early return');
      return;
    }
    
    const object = e.target;
    const objectType = object.type || 'unknown';
    const objectData = object.toJSON();
    
    const operation = {
      objectType,
      objectData,
      action: 'removed',
    };
    
    // Send operation to the server via socket
    if (socketRef.current) {
      socketRef.current.emitDrawingOperation(operation);
    }
    
    // Add to local state
    dispatch(addOperation({
      id: Date.now(),
      objectType,
      objectData,
      action: 'removed',
      createdAt: new Date().toISOString(),
      canvasId: currentCanvas?.id || 0,
      userId: user.id
    }));
  };
  
  const handleMouseMove = (e: fabric.IEvent) => {
    if (!user || !socketRef.current || !e.pointer) return;
    
    const { x, y } = e.pointer;
    socketRef.current.emitCursorPosition({ x, y });
  };
  
  // Save the canvas state
  const handleSaveCanvasState = () => {
    if (!fabricCanvasRef.current || !user) return;
    
    console.log('⚠️ Save canvas state called, but currentCanvas may be null');
    
    const canvasState = fabricCanvasRef.current.toJSON();
    
    // Use the saveCanvasState action
    dispatch(saveCanvasState({
      roomId,
      state: canvasState
    }));
  };
  
  // Drawing tool handlers
  const handleToolChange = (tool: DrawingTools) => {
    setCurrentTool(tool);
  };
  
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    
    if (fabricCanvasRef.current?.isDrawingMode) {
      fabricCanvasRef.current.freeDrawingBrush.color = newColor;
    }
  };
  
  const handleBrushSizeChange = (newSize: number) => {
    setBrushSize(newSize);
    
    if (fabricCanvasRef.current?.isDrawingMode) {
      fabricCanvasRef.current.freeDrawingBrush.width = newSize;
    }
  };
  
  const handleClearCanvas = () => {
    if (fabricCanvasRef.current && !readOnly) {
      fabricCanvasRef.current.clear();
      handleSaveCanvasState();
    }
  };
  
  const handleAddShape = (shapeType: 'rectangle' | 'circle' | 'line') => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const canvas = fabricCanvasRef.current;
  let shape: fabric.Object | null = null;
    
    switch (shapeType) {
      case 'rectangle':
  shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: fillColor,
          stroke: color,
          strokeWidth: brushSize,
          strokeDashArray: strokeStyle === 'dashed' ? [8, 4] : strokeStyle === 'dotted' ? [2, 4] : undefined,
          rx: 3,
          ry: 3,
        });
        break;
      case 'circle':
  shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: fillColor,
          stroke: color,
          strokeWidth: brushSize,
          strokeDashArray: strokeStyle === 'dashed' ? [8, 4] : strokeStyle === 'dotted' ? [2, 4] : undefined,
        });
        break;
      case 'line':
  shape = new fabric.Line([50, 100, 200, 100], {
          left: 100,
          top: 100,
          stroke: color,
          strokeWidth: brushSize,
          strokeDashArray: strokeStyle === 'dashed' ? [8, 4] : strokeStyle === 'dotted' ? [2, 4] : undefined,
        });
        break;
    }
    
  if (shape) {
      applyCommonObjectProps(shape);
  shape.set('opacity', opacity);
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  };
  
  const handleAddText = () => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const canvas = fabricCanvasRef.current;
    const text = new fabric.IText('Double-click to edit text', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: color,
      fontFamily: 'Arial',
    });
    applyCommonObjectProps(text);
  text.set('opacity', opacity);
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };
  
  const handleAddStickyNote = (noteColor: string = NOTE_COLORS.YELLOW) => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const canvas = fabricCanvasRef.current;
    const group = new fabric.Group([], {
      left: 100,
      top: 100,
    });
    
    // Create background rectangle for sticky note
    const rect = new fabric.Rect({
      width: 150,
      height: 150,
      fill: noteColor,
      strokeWidth: 1,
      stroke: '#00000020',
      rx: 3,
      ry: 3,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.2)', blur: 5, offsetX: 2, offsetY: 2 }),
    });
    
    // Create editable text for the sticky
    const text = new fabric.IText('Double-click to\nedit this note', {
      fontSize: 16,
      fill: '#000000',
      fontFamily: 'Arial',
      textAlign: 'left',
      left: 10,
      top: 10,
      width: 130,
    });
    
    group.addWithUpdate(rect);
    group.addWithUpdate(text);
    applyCommonObjectProps(group);
  group.set('opacity', opacity);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };
  
  const handleAddArrow = () => {
    if (!fabricCanvasRef.current || readOnly) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Create line with arrow
    const line = new fabric.Line([50, 50, 200, 50], {
      stroke: color,
      strokeWidth: 2,
      selectable: true,
      strokeLineCap: 'round',
    });
    
    // Create arrow head
    const triangle = new fabric.Triangle({
      width: 15,
      height: 15,
      fill: color,
      left: 200,
      top: 50,
      angle: 90,
      originX: 'center',
      originY: 'center',
    });
    
    // Group line and arrow head
    const arrow = new fabric.Group([line, triangle], {
      left: 100,
      top: 100,
    });
    applyCommonObjectProps(arrow);
  arrow.set('opacity', opacity);
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
    canvas.renderAll();
  };

  // Common styling applied to new objects
  const applyCommonObjectProps = (obj: fabric.Object) => {
    obj.set({
      borderColor: '#4F46E5', // indigo-600
      cornerColor: '#4338CA', // indigo-700
      cornerStyle: 'circle',
      transparentCorners: false,
      selectable: !readOnly,
      hasControls: true,
    });
  };

  // Layer controls
  const bringForward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) { canvas.bringForward(active); canvas.requestRenderAll(); }
  };
  const sendBackward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) { canvas.sendBackwards(active); canvas.requestRenderAll(); }
  };
  const bringToFront = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) { canvas.bringToFront(active); canvas.requestRenderAll(); }
  };
  const sendToBack = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) { canvas.sendToBack(active); canvas.requestRenderAll(); }
  };
  
  return (
    <div className="canvas-container w-full h-full flex flex-col bg-gray-100">
      {/* Top toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Tools */}
          <div className="flex items-center space-x-1 bg-gray-50 rounded-md p-1">
            <button className={`p-2 rounded ${currentTool === DrawingTools.SELECT ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => handleToolChange(DrawingTools.SELECT)} title="Select">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 2l7.5 18 3-7 7-3L2 2z"/></svg>
            </button>
            <button className={`p-2 rounded ${currentTool === DrawingTools.PENCIL ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => handleToolChange(DrawingTools.PENCIL)} title="Pencil">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button className={`p-2 rounded ${currentTool === DrawingTools.PAN ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => handleToolChange(DrawingTools.PAN)} title="Pan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"/></svg>
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button className="p-2 rounded text-gray-600 hover:bg-gray-100" onClick={() => handleAddShape('rectangle')} title="Rectangle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            </button>
            <button className="p-2 rounded text-gray-600 hover:bg-gray-100" onClick={() => handleAddShape('circle')} title="Circle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
            </button>
            <button className={`p-2 rounded ${currentTool === DrawingTools.LINE ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => handleToolChange(DrawingTools.LINE)} title="Line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20L20 4"/></svg>
            </button>
            <button className={`p-2 rounded ${currentTool === DrawingTools.ARROW ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => handleToolChange(DrawingTools.ARROW)} title="Arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h12"/><path d="M14 8l4 4-4 4"/></svg>
            </button>
            <button className="p-2 rounded text-gray-600 hover:bg-gray-100" onClick={handleAddText} title="Text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            </button>
          </div>

          {/* Style controls */}
          <div className="flex items-center space-x-3">
            <label htmlFor="stroke-color-input" className="sr-only">Stroke Color</label>
            <input 
              id="stroke-color-input"
              type="color" 
              value={color} 
              onChange={(e) => handleColorChange(e.target.value)} 
              className="w-8 h-8 rounded border border-gray-300 cursor-pointer" 
              aria-label="Stroke color"
            />
            <label htmlFor="fill-color-input" className="sr-only">Fill Color</label>
            <input 
              id="fill-color-input"
              type="color" 
              value={fillColor === 'transparent' ? '#ffffff' : fillColor} 
              onChange={(e) => setFillColor(e.target.value)} 
              className="w-8 h-8 rounded border border-gray-300 cursor-pointer" 
              aria-label="Fill color"
            />
            <button className="px-2 py-1 text-xs border rounded" onClick={() => setFillColor('transparent')} title="Transparent Fill" aria-label="Set fill to transparent">⧅</button>
            <div className="text-sm text-gray-600" aria-hidden="true">{brushSize}px</div>
            <label htmlFor="brush-size-input" className="sr-only">Brush Size</label>
            <input 
              id="brush-size-input"
              type="range" 
              min="1" 
              max="20" 
              value={brushSize} 
              onChange={(e) => handleBrushSizeChange(parseInt(e.target.value))} 
              className="w-20"
              aria-label={`Brush size: ${brushSize} pixels`}
            />
            <div className="flex items-center space-x-1">
              <button className={`px-2 py-1 text-xs border rounded ${strokeStyle==='solid'?'bg-indigo-100 border-indigo-400':''}`} onClick={() => setStrokeStyle('solid')} title="Solid">—</button>
              <button className={`px-2 py-1 text-xs border rounded ${strokeStyle==='dashed'?'bg-indigo-100 border-indigo-400':''}`} onClick={() => setStrokeStyle('dashed')} title="Dashed">- -</button>
              <button className={`px-2 py-1 text-xs border rounded ${strokeStyle==='dotted'?'bg-indigo-100 border-indigo-400':''}`} onClick={() => setStrokeStyle('dotted')} title="Dotted">⋯</button>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="opacity-slider" className="text-sm text-gray-600">Opacity</label>
              <input 
                id="opacity-slider"
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={opacity} 
                onChange={(e)=>setOpacity(parseFloat(e.target.value))} 
                className="w-24"
                aria-label={`Opacity: ${Math.round(opacity * 100)}%`}
              />
            </div>
            {currentTool === DrawingTools.ARROW && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600" id="arrow-heads-group">Heads</span>
                <label htmlFor="arrow-head-start" className="text-xs flex items-center space-x-1">
                  <input 
                    id="arrow-head-start"
                    type="checkbox" 
                    checked={arrowHeadStart} 
                    onChange={(e)=>setArrowHeadStart(e.target.checked)}
                    aria-describedby="arrow-heads-group"
                  /> 
                  <span>Start</span>
                </label>
                <label htmlFor="arrow-head-end" className="text-xs flex items-center space-x-1">
                  <input 
                    id="arrow-head-end"
                    type="checkbox" 
                    checked={arrowHeadEnd} 
                    onChange={(e)=>setArrowHeadEnd(e.target.checked)}
                    aria-describedby="arrow-heads-group"
                  /> 
                  <span>End</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-gray-50 rounded-md p-1">
            <button className="px-2 py-1 rounded hover:bg-gray-100 text-sm" title="Zoom Out">-</button>
            <span className="text-sm px-2">100%</span>
            <button className="px-2 py-1 rounded hover:bg-gray-100 text-sm" title="Zoom In">+</button>
          </div>

          {/* Layers */}
          <div className="flex items-center space-x-1 bg-gray-50 rounded-md p-1">
            <button className="px-2 py-1 rounded hover:bg-gray-100 text-sm" title="Send Back" onClick={sendToBack}>⤓</button>
            <button className="px-2 py-1 rounded hover:bg-gray-100 text-sm" title="Send Backward" onClick={sendBackward}>↓</button>
            <button className="px-2 py-1 rounded hover:bg-gray-100 text-sm" title="Bring Forward" onClick={bringForward}>↑</button>
            <button className="px-2 py-1 rounded hover:bg-gray-100 text-sm" title="Bring Front" onClick={bringToFront}>⤒</button>
          </div>

          {/* Action buttons */}
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700" onClick={handleSaveCanvasState} title="Save">Save</button>
          <button className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700" onClick={handleClearCanvas} title="Clear All">Clear All</button>

          {/* Active users */}
          <div className="flex -space-x-1">
            {activeUsers.slice(0, 3).map((u: any, index: number) => (
              <div key={u.socketId || index} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: `hsl(${(u.userId * 137) % 360}, 70%, 50%)` }} title={u.username || `User ${u.userId}`}>
                {(u.username || `U${u.userId}`).charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex">
        {/* Left panel for shapes/elements (like draw.io) */}
        <div className="w-64 bg-white border-r border-gray-300 flex-shrink-0 overflow-y-auto">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Shapes</h3>
            <div className="grid grid-cols-3 gap-2">
              <button 
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
                onClick={() => handleAddShape('rectangle')}
                title="Rectangle"
              >
                <svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke="#666" strokeWidth="1">
                  <rect x="1" y="1" width="22" height="14" rx="2"/>
                </svg>
              </button>
              <button 
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
                onClick={() => handleAddShape('circle')}
                title="Circle"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#666" strokeWidth="1">
                  <circle cx="10" cy="10" r="9"/>
                </svg>
              </button>
              <button 
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
                onClick={() => handleAddArrow()}
                title="Arrow"
              >
                <svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke="#666" strokeWidth="1">
                  <path d="M1 8h18m-6-6l6 6-6 6"/>
                </svg>
              </button>
              <button 
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
                onClick={() => handleAddText()}
                title="Text"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="#666">
                  <path d="M3 4h14v2H3V4zm0 4h14v2H3V8zm0 4h10v2H3v-2z"/>
                </svg>
              </button>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3 mt-6">Sticky Notes</h3>
            <div className="grid grid-cols-3 gap-2">
              <button 
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
                onClick={() => handleAddStickyNote(NOTE_COLORS.YELLOW)}
                style={{ backgroundColor: NOTE_COLORS.YELLOW }}
                title="Yellow Note"
              >
                <span className="text-xs">Note</span>
              </button>
              <button 
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
                onClick={() => handleAddStickyNote(NOTE_COLORS.BLUE)}
                style={{ backgroundColor: NOTE_COLORS.BLUE }}
                title="Blue Note"
              >
                <span className="text-xs">Note</span>
              </button>
              <button 
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
                onClick={() => handleAddStickyNote(NOTE_COLORS.GREEN)}
                style={{ backgroundColor: NOTE_COLORS.GREEN }}
                title="Green Note"
              >
                <span className="text-xs">Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-white relative overflow-hidden">
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
              <canvas 
                ref={canvasRef} 
                className="border border-gray-300 shadow-sm bg-white"
                style={{ width: `${width}px`, height: `${height}px` }}
              />
              
              {/* Note: Removed overlay grid to avoid covering drawn objects. */}
              
              {/* Other users' cursors */}
              {activeUsers
                .filter((user: any) => user.userId !== (user?.id || 0) && user.cursorPosition)
                .map((activeUser: any) => (
                  <div 
                    key={activeUser.socketId}
                    className="absolute pointer-events-none z-50"
                    style={{
                      left: activeUser.cursorPosition?.x || 0,
                      top: activeUser.cursorPosition?.y || 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path 
                        d="M0 0l6 14 2-6 6-2L0 0z" 
                        fill={`hsl(${(activeUser.userId * 137) % 360}, 70%, 50%)`}
                      />
                    </svg>
                    <span 
                      className="absolute top-4 left-4 px-2 py-1 rounded text-xs text-white text-nowrap"
                      style={{ backgroundColor: `hsl(${(activeUser.userId * 137) % 360}, 70%, 50%)` }}
                    >
                      {activeUser.username || `User ${activeUser.userId}`}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasComponent;