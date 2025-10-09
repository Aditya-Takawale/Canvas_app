import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { fabric } from 'fabric';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addOperation, saveCanvasState, fetchCanvas, clearOperations, fetchCanvasHistory, addActiveUser } from '../store/slices/canvasSlice';
// Import our new collaboration system
import { useRealTimeCollaboration, CursorOverlay, ConnectionStatus } from './RealTimeCollaboration';
import { CursorOptimizer } from '../utils/canvasOptimizer';
import CursorOverlayOld from './CursorOverlay';
import { CursorPosition } from '../types/multiUser';

// Utility function to generate color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

interface CollaborativeFigmaCanvasProps {
  roomId: number;
  readOnly?: boolean;
}

/**
 * Enhanced FigmaCanvas with real-time collaboration using WebSocket
 * Replaces Socket.IO with our custom WebSocket-based collaboration system
 */
const CollaborativeFigmaCanvas: React.FC<CollaborativeFigmaCanvasProps> = ({ 
  roomId, 
  readOnly = false 
}) => {
  // Canvas refs and state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isInitializedRef = useRef(false);
  
  // Cursor optimization ref
  const cursorOptimizerRef = useRef<CursorOptimizer | null>(null);
  
  // Responsive canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingStateRef = useRef(false);
  const lastRestoredStateRef = useRef<string | null>(null);
  const currentRoomIdRef = useRef<number | null>(null);
  const [isCanvasLoading, setIsCanvasLoading] = useState(true);
  
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
  
  // Use ref for username to avoid recreating callbacks
  const usernameRef = useRef<string | undefined>();
  useEffect(() => {
    usernameRef.current = user?.username;
  }, [user?.username]);
  
  // Create stable references to prevent unnecessary re-renders
  const userId = useMemo(() => user?.id, [user?.id]);
  const isUserReady = useMemo(() => !!user && !!userId, [user, userId]);
  const { currentCanvas, operations: rawOperations, unauthorized } = useAppSelector((state) => state.canvas as any);
  const operations = rawOperations || [];

  // Tool state from Redux
  const activeTool = useAppSelector(state => (state.canvas as any).activeTool || 'pencil') as string;
  const brushSize = useAppSelector(state => (state.canvas as any).brushSize || 5) as number;
  const brushColor = useAppSelector(state => (state.canvas as any).brushColor || '#000000') as string;

  // Real-time collaboration hook
  const {
    isConnected,
    userId: collabUserId,
    cursors,
    sendCursorMove,
    sendDrawingEvent,
    joinRoom,
    error: collabError
  } = useRealTimeCollaboration();

  // Join collaboration room when connected
  useEffect(() => {
    if (isConnected && roomId) {
      joinRoom(`canvas-room-${roomId}`, usernameRef.current);
    }
  }, [isConnected, roomId, joinRoom]);

  // Handle remote drawing events
  useEffect(() => {
    const handleMessage = (data: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isLoadingStateRef.current) return;

      try {
        console.log('🎨 Received message:', data);
        
        if (data.type === 'DRAWING_EVENT') {
          // Don't apply our own drawing events
          if (data.userId === collabUserId) return;

          console.log('🎨 Processing drawing event type:', data.drawingType);

          switch (data.drawingType) {
            case 'object-added':
              console.log('🎨 Adding object:', data.data);
              fabric.util.enlivenObjects([data.data], (enlivenedObjects: fabric.Object[]) => {
                const obj = enlivenedObjects[0];
                if (obj && canvas) {
                  // Set loading state before adding
                  isLoadingStateRef.current = true;
                  
                  // Mark object as remote to prevent sending events
                  (obj as any)._isRemote = true;
                  
                  canvas.add(obj);
                  canvas.renderAll();
                  
                  // Reset loading state after a delay
                  setTimeout(() => {
                    isLoadingStateRef.current = false;
                  }, 100);
                }
              }, '');
              break;
              
            case 'path-created':
              console.log('🎨 Adding path:', data.data);
              fabric.util.enlivenObjects([data.data], (enlivenedObjects: fabric.Object[]) => {
                const path = enlivenedObjects[0];
                if (path && canvas) {
                  // Set loading state before adding
                  isLoadingStateRef.current = true;
                  
                  // Mark path as remote to prevent sending events
                  (path as any)._isRemote = true;
                  
                  canvas.add(path);
                  canvas.renderAll();
                  
                  // Reset loading state after a delay
                  setTimeout(() => {
                    isLoadingStateRef.current = false;
                  }, 100);
                }
              }, '');
              break;
              
            case 'object-modified':
              console.log('🎨 Modifying object:', data.data);
              const targetObj = canvas.getObjects().find((obj: any) => obj._cid === data.data._cid);
              if (targetObj) {
                isLoadingStateRef.current = true;
                targetObj.set(data.data);
                canvas.renderAll();
                setTimeout(() => {
                  isLoadingStateRef.current = false;
                }, 50);
              }
              break;
              
            case 'object-removed':
              console.log('🗑️ Removing object:', data.data);
              const objToRemove = canvas.getObjects().find((obj: any) => obj._cid === data.data._cid);
              if (objToRemove) {
                isLoadingStateRef.current = true;
                canvas.remove(objToRemove);
                canvas.renderAll();
                setTimeout(() => {
                  isLoadingStateRef.current = false;
                }, 50);
              }
              break;
              
            case 'canvas-cleared':
              console.log('🗑️ Clearing canvas from remote event');
              isLoadingStateRef.current = true;
              const objects = canvas.getObjects();
              canvas.remove(...objects);
              canvas.renderAll();
              setTimeout(() => {
                isLoadingStateRef.current = false;
              }, 50);
              break;
              
            default:
              console.log('🎨 Unknown drawing event type:', data.drawingType);
          }
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
      }
    };

    // Set up message handler for the collaboration hook
    (window as any).collabMessageHandler = handleMessage;
    
    return () => {
      if ((window as any).collabMessageHandler === handleMessage) {
        (window as any).collabMessageHandler = null;
      }
    };
  }, [collabUserId]);

  // Canvas resize handling
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Calculate dimensions with padding
      const padding = 40;
      const newWidth = Math.max(400, rect.width - padding);
      const newHeight = Math.max(300, rect.height - padding);
      
      if (newWidth !== canvasDimensions.width || newHeight !== canvasDimensions.height) {
        setCanvasDimensions({ width: newWidth, height: newHeight });
        
        // Update fabric canvas size if it exists
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({ width: newWidth, height: newHeight });
          fabricCanvasRef.current.renderAll();
        }
      }
    };

    // Initial size calculation
    updateCanvasSize();

    // Set up resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback: window resize listener
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [canvasDimensions.width, canvasDimensions.height]);

  // Shape creation (pure, no side-effects: returns a fabric object WITHOUT adding to canvas or emitting events)
  const createShape = useCallback((startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, shapeType: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

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
      stroke: brushColor,
      strokeWidth: Math.max(2, brushSize / 3),
      selectable: true,
      evented: true,
      perPixelTargetFind: true,
      strokeUniform: true,
      objectCaching: true,
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
        const radius = Math.max(5, Math.min(width, height) / 2);
        shape = new fabric.Circle({
          ...shapeOptions,
          radius,
          left: left + width / 2 - radius,
          top: top + height / 2 - radius,
          strokeWidth: Math.max(2, brushSize / 3),
        });
        break;

      case 'line':
        shape = new fabric.Line([left, top, left + width, top + height], {
          ...shapeOptions,
          strokeWidth: Math.max(2, brushSize),
        });
        break;

      case 'arrow':
        const arrowGroup = new fabric.Group([
          new fabric.Line([0, 0, width, 0], {
            stroke: brushColor,
            strokeWidth: Math.max(2, brushSize),
          }),
          new fabric.Triangle({
            left: width - 10,
            top: -5,
            width: 10,
            height: 10,
            fill: brushColor,
            angle: 90,
          })
        ], {
          left,
          top,
          selectable: true,
          evented: true,
        });
        shape = arrowGroup;
        break;

      case 'triangle':
        shape = new fabric.Triangle({
          ...shapeOptions,
          width,
          height,
        });
        break;

      case 'star':
        const starPoints = [];
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.5;
        const numPoints = 5;
        
        for (let i = 0; i < numPoints * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / numPoints;
          starPoints.push({
            x: left + width / 2 + radius * Math.cos(angle - Math.PI / 2),
            y: top + height / 2 + radius * Math.sin(angle - Math.PI / 2)
          });
        }
        
        shape = new fabric.Polygon(starPoints, {
          ...shapeOptions,
        });
        break;
    }

    if (!shape) return null;
    // Mark as preview (no attribution yet, no events)
    (shape as any)._isPreview = true;
    return shape;
  }, [brushColor, brushSize]);

  // Apply tool settings to canvas
  const applyToolSettings = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.selection = activeTool === 'select';
    canvas.isDrawingMode = activeTool === 'pencil';

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushSize;
    }

    // Set cursor based on active tool
    if (activeTool === 'pan') {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      canvas.moveCursor = 'grabbing';
    } else if (activeTool === 'eraser') {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.moveCursor = 'crosshair';
    } else {
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      canvas.moveCursor = 'move';
    }
  }, [activeTool, brushColor, brushSize]);

  // Canvas event handlers
  const handleMouseDown = useCallback((e: fabric.IEvent) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;

    const pointer = canvas.getPointer(e.e);
    console.log('🖱️ Mouse down:', { activeTool, pointer, isLoading: isLoadingStateRef.current });
    
    if (activeTool === 'eraser') {
      // Eraser mode: delete objects on click
      const target = canvas.findTarget(e.e as any, false);
      if (target && !target.isType('activeSelection')) {
        isLoadingStateRef.current = true;
        
        const objectId = (target as any)._cid;
        canvas.remove(target);
        canvas.renderAll();
        
        // Send delete event to other users
        sendDrawingEvent({
          type: 'object-removed',
          data: { _cid: objectId },
          userId: collabUserId
        });
        
        isLoadingStateRef.current = false;
        console.log('🧹 Erased object:', objectId);
      }
      return;
    }
    
    if (activeTool === 'pan') {
      const mouseEvent = e.e as MouseEvent;
      panStateRef.current = {
        isDragging: true,
        lastPosX: mouseEvent.clientX,
        lastPosY: mouseEvent.clientY,
      };
      canvas.defaultCursor = 'grabbing';
      canvas.hoverCursor = 'grabbing';
    } else if (['rectangle', 'circle', 'line', 'arrow', 'triangle', 'star'].includes(activeTool)) {
      isDrawingShapeRef.current = true;
      shapeStartPointRef.current = { x: pointer.x, y: pointer.y };
      
      // Create initial preview shape
      const previewShape = createShape(
        { x: pointer.x, y: pointer.y },
        { x: pointer.x + 5, y: pointer.y + 5 },
        activeTool
      );
      if (previewShape) {
        currentShapeRef.current = previewShape;
        canvas.add(previewShape);
        canvas.renderAll();
        console.log('🎨 Created preview shape:', activeTool);
      }
    } else if (activeTool === 'text') {
      // Create text object at click position
      const text = new fabric.IText('Type here...', {
        left: pointer.x,
        top: pointer.y,
        fontFamily: 'Arial',
        fontSize: Math.max(14, brushSize * 2),
        fill: brushColor,
        selectable: true,
        evented: true,
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: 5,
      });
      
      // Add user attribution
      (text as any).createdBy = user?.id || 0;
      (text as any).createdByName = user?.username || 'Unknown';
      (text as any).createdByColor = '#007bff';
      (text as any)._cid = `obj-${Date.now()}-${Math.floor(Math.random()*100000)}`;
      
      // Temporarily disable events to prevent triggering handleObjectAdded
      isLoadingStateRef.current = true;
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      
      // Reset loading state after a brief delay
      setTimeout(() => {
        isLoadingStateRef.current = false;
      }, 100);
      
      // Send drawing event
      sendDrawingEvent({
        type: 'object-added',
        data: text.toObject(['_cid', 'createdBy', 'createdByName', 'createdByColor']),
        userId: collabUserId
      });
    }
  }, [activeTool, brushColor, brushSize, user, userId, collabUserId, sendDrawingEvent]);

  const handleMouseMove = useCallback((e: fabric.IEvent) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(e.e);
    
    // Send cursor position for real-time collaboration
    sendCursorMove(pointer.x, pointer.y, usernameRef.current);

    if (panStateRef.current.isDragging && activeTool === 'pan') {
      const mouseEvent = e.e as MouseEvent;
      const deltaX = mouseEvent.clientX - panStateRef.current.lastPosX;
      const deltaY = mouseEvent.clientY - panStateRef.current.lastPosY;

      canvas.relativePan({ x: deltaX, y: deltaY });
      
      panStateRef.current.lastPosX = mouseEvent.clientX;
      panStateRef.current.lastPosY = mouseEvent.clientY;
    } else if (isDrawingShapeRef.current && shapeStartPointRef.current) {
      // Update live shape dimensions instead of recreating repeatedly
      if (currentShapeRef.current) {
        const sp = shapeStartPointRef.current;
        const shape = currentShapeRef.current as any;
        const width = Math.max(5, Math.abs(pointer.x - sp.x));
        const height = Math.max(5, Math.abs(pointer.y - sp.y));
        const left = Math.min(sp.x, pointer.x);
        const top = Math.min(sp.y, pointer.y);

        if (shape.type === 'rect' || shape.type === 'triangle' || shape.type === 'polygon') {
          shape.set({ left, top, width, height });
        } else if (shape.type === 'circle') {
          const radius = Math.max(5, Math.min(width, height) / 2);
          shape.set({ left: left + width / 2 - radius, top: top + height / 2 - radius, radius });
        } else if (shape.type === 'line') {
          shape.set({ x1: sp.x, y1: sp.y, x2: pointer.x, y2: pointer.y });
        } else if (shape.type === 'group') { // arrow
          // Simplest approach: scale group
          const scaleX = width / Math.max(1, shape.width);
            const scaleY = 1; // keep arrow thickness constant
            shape.set({ left, top, scaleX, scaleY });
        }
        canvas.renderAll();
      }
    }
  }, [activeTool, sendCursorMove]);


  const handleMouseUp = useCallback((e: fabric.IEvent) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (panStateRef.current.isDragging) {
      panStateRef.current.isDragging = false;
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
    }

    if (isDrawingShapeRef.current) {
      // Finalize shape & emit single event
      const shape: any = currentShapeRef.current;
      if (shape) {
        // Remove preview marker
        delete shape._isPreview;
        if (!shape._cid) {
          shape.createdBy = user?.id || 0;
          shape.createdByName = user?.username || 'Unknown';
          shape.createdByColor = '#007bff';
          shape._cid = `obj-${Date.now()}-${Math.floor(Math.random()*100000)}`;
        }
        // Emit event
        sendDrawingEvent({
          type: 'object-added',
          data: shape.toObject(['_cid','createdBy','createdByName','createdByColor']),
          userId: collabUserId
        });
        console.log('🟢 Finalized shape and sent object-added once:', shape.type);
        // Record operation
        dispatch(addOperation({
          objectType: shape.type,
          objectData: shape.toObject(['_cid','createdBy','createdByName','createdByColor']),
          action: 'added',
          userId: userId || 0,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          canvasId: currentCanvas?.id || 0
        }));
      }
      isDrawingShapeRef.current = false;
      shapeStartPointRef.current = null;
      currentShapeRef.current = null;
    }
  }, [user, userId, collabUserId, sendDrawingEvent, dispatch, currentCanvas]);

  const handlePathCreated = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;

    const path = e.path;
    if (path) {
      // Don't send events for remote objects
      if ((path as any)._isRemote) {
        console.log('🔄 Skipping event for remote path');
        return;
      }

      // Apply current settings to the path
      path.set({
        stroke: brushColor,
        fill: 'transparent',
        strokeWidth: Math.max(1, brushSize),
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        strokeMiterLimit: 10,
      });

      // Add user attribution and unique ID
      (path as any).createdBy = user?.id || 0;
      (path as any).createdByName = user?.username || 'Unknown';
      (path as any).createdByColor = '#007bff';
      (path as any)._cid = `obj-${Date.now()}-${Math.floor(Math.random()*100000)}`;

      // Send drawing event to other users
      sendDrawingEvent({
        type: 'path-created',
        data: path.toObject(['_cid', 'createdBy', 'createdByName', 'createdByColor']),
        userId: collabUserId
      });

      console.log('🎨 Sent path-created event');

      // Dispatch to Redux for persistence (minimal structure for real-time sync)
      const operationData = {
        objectType: 'path',
        objectData: path.toObject(['_cid', 'createdBy', 'createdByName', 'createdByColor']),
        action: 'added',
        userId: userId || 0,
        id: Date.now(), // Temporary ID for real-time sync
        createdAt: new Date().toISOString(),
        canvasId: currentCanvas?.id || 0
      };
      dispatch(addOperation(operationData));
    }
  }, [brushColor, brushSize, user, userId, collabUserId, sendDrawingEvent, dispatch]);

  const handleObjectAdded = useCallback((e: fabric.IEvent) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;

    const obj = e.target;
    if (!obj) return;
    if ((obj as any)._isRemote) return; // remote
    if ((obj as any)._isPreview) return; // preview; final event on mouse up
    if (!(obj as any)._cid) {
      (obj as any).createdBy = user?.id || 0;
      (obj as any).createdByName = user?.username || 'Unknown';
      (obj as any).createdByColor = '#007bff';
      (obj as any)._cid = `obj-${Date.now()}-${Math.floor(Math.random()*100000)}`;
      console.log('🔧 Assigned attribution to object without emitting (will emit on finalize).');
    }
  }, [user]);

  const handleObjectModified = useCallback((e: fabric.IEvent) => {
    const obj = e.target;
    if (obj && !isLoadingStateRef.current) {
      // Send modification event to other users
      sendDrawingEvent({
        type: 'object-modified',
        data: obj.toObject(['_cid', 'createdBy', 'createdByName', 'createdByColor']),
        userId: collabUserId
      });
    }
  }, [collabUserId, sendDrawingEvent]);

  // Load canvas state from backend
  const loadCanvasState = useCallback(async () => {
    if (!roomId || !userId) return;

    setIsCanvasLoading(true);
    console.log('🎨 Collaborative: Loading canvas state for room', roomId);

    try {
      // Fetch canvas history
      const historyAction = await dispatch(fetchCanvasHistory({ roomId, limit: 1000 }));
      
      if (fetchCanvasHistory.fulfilled.match(historyAction)) {
        const { operations: historyOps, state } = historyAction.payload.data;
        let backendHadContent = false;
        
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          // Set loading flag before clearing to prevent event loops
          isLoadingStateRef.current = true;
          
          // Clear canvas first - check if canvas context exists
          if (canvas.getContext()) {
            canvas.clear();
          }
          
          if (state) {
            backendHadContent = true;
            // Load saved state
            canvas.loadFromJSON(state, () => {
              canvas.renderAll();
              isLoadingStateRef.current = false;
              console.log('✅ Collaborative: Canvas state loaded from backend');
            });
          } else if (historyOps && historyOps.length > 0) {
            backendHadContent = true;
            // Apply operations
            console.log(`🔄 Collaborative: Applying ${historyOps.length} operations`);
            
            for (const op of historyOps) {
              if (op.action === 'added') {
                try {
                  const objectData = typeof op.objectData === 'string' 
                    ? JSON.parse(op.objectData) 
                    : op.objectData;
                  
                  fabric.util.enlivenObjects([objectData], (enlivenedObjects: fabric.Object[]) => {
                    const obj = enlivenedObjects[0];
                    if (obj) {
                      canvas.add(obj);
                    }
                  }, '');
                } catch (error) {
                  console.error('❌ Error applying operation:', error);
                }
              }
            }
            
            canvas.renderAll();
            isLoadingStateRef.current = false;
          }
          
          // Configure canvas after loading
          canvas.renderOnAddRemove = true;
          canvas.perPixelTargetFind = true;
          canvas.targetFindTolerance = 5;
          canvas.centeredScaling = true;
          canvas.snapAngle = 15;
          canvas.stopContextMenu = true;
          // If backend provided no content, attempt auto-restore from local snapshot
          if (!backendHadContent) {
            try {
              const snapshotKey = `canvasSnapshots:${roomId}`;
              const existingRaw = localStorage.getItem(snapshotKey);
              if (existingRaw) {
                const snapshots = JSON.parse(existingRaw);
                const last = snapshots[snapshots.length - 1];
                if (last?.state) {
                  console.log('♻️ Auto-restoring last local snapshot (backend empty)');
                  isLoadingStateRef.current = true;
                  canvas.loadFromJSON(last.state, () => {
                    canvas.renderAll();
                    isLoadingStateRef.current = false;
                    console.log('✅ Auto-restore complete');
                  });
                } else {
                  console.log('ℹ️ No local snapshot state to auto-restore');
                  isLoadingStateRef.current = false;
                }
              } else {
                console.log('ℹ️ No local snapshots found for auto-restore');
                isLoadingStateRef.current = false;
              }
            } catch (err) {
              console.warn('⚠️ Failed auto-restore attempt', err);
              isLoadingStateRef.current = false;
            }
          } else {
            // Backend had content, no auto-restore needed
            isLoadingStateRef.current = false;
          }
        }
      }
    } catch (error) {
      console.error('❌ Collaborative: Failed to load canvas state:', error);
    } finally {
      setIsCanvasLoading(false);
    }
  }, [roomId, userId, dispatch]);

  // Canvas initialization
  useEffect(() => {
    if (isInitializedRef.current || !canvasRef.current) return;
    
    console.log('🎨 Collaborative: Initializing canvas');
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      backgroundColor: '#ffffff',
      isDrawingMode: !readOnly,
      selection: !readOnly,
      renderOnAddRemove: false,
      skipTargetFind: false,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    isInitializedRef.current = true;
  (window as any).fabricActiveCanvas = canvas;

    // Configure brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.strokeLineCap = 'round';
      canvas.freeDrawingBrush.strokeLineJoin = 'round';
    }

    // Apply initial tool settings
    applyToolSettings();

    // Attach event handlers
    if (!readOnly) {
      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);
      canvas.on('object:modified', handleObjectModified);
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
    }

    console.log('✅ Collaborative: Canvas initialization complete');

    // Load canvas state after initialization
    loadCanvasState();

    return () => {
      console.log('🧹 Collaborative: Component unmounting, disposing canvas', {
        roomId,
        readOnly,
        hasDispatch: !!dispatch,
        reason: 'cleanup'
      });
      
      // Save canvas state before unmounting
      if (canvas && roomId) {
        const canvasJSON = canvas.toJSON(['_cid', 'createdBy', 'createdByName', 'createdByColor']);
        dispatch(saveCanvasState({ 
          roomId, 
          state: canvasJSON 
        }));
        console.log('💾 Saved canvas state before unmounting');
      }
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      canvas.dispose();
      isInitializedRef.current = false;
    };
  }, [readOnly, roomId, dispatch]);

  // Handle canvas resizing separately to prevent clearing on resize
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitializedRef.current) return;
    
    console.log('🔄 Resizing canvas to:', canvasDimensions.width, 'x', canvasDimensions.height);
    
    // Resize canvas without clearing objects
    canvas.setDimensions({
      width: canvasDimensions.width,
      height: canvasDimensions.height
    });
    canvas.renderAll();
  }, [canvasDimensions.width, canvasDimensions.height]);

  // === Snapshot Persistence (local) ===
  const localSnapshotKey = useMemo(()=> `canvasSnapshots:${roomId}`, [roomId]);

  const saveLocalSnapshot = useCallback(() => {
    if (!roomId) {
      console.warn('⚠️ Cannot save snapshot: No roomId');
      return;
    }
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.warn('⚠️ Cannot save snapshot: No canvas');
      return;
    }
    try {
      const key = `canvasSnapshots:${roomId}`;
      const state = canvas.toJSON(['_cid','createdBy','createdByName','createdByColor']);
      const existingRaw = localStorage.getItem(key);
      const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push({ timestamp: Date.now(), state });
      // Keep only last 10
      while (existing.length > 10) existing.shift();
      localStorage.setItem(key, JSON.stringify(existing));
      console.log(`💾 Saved local snapshot for room ${roomId}. Total snapshots: ${existing.length}`, {
        objectCount: state.objects?.length || 0,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch(err) {
      console.error('❌ Failed to save local snapshot:', err);
    }
  }, [roomId]);

  const restoreLatestSnapshot = useCallback(() => {
    if (!roomId) {
      console.warn('⚠️ Cannot restore snapshot: No roomId');
      return;
    }
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.warn('⚠️ Cannot restore snapshot: No canvas');
      return;
    }
    try {
      const key = `canvasSnapshots:${roomId}`;
      const existingRaw = localStorage.getItem(key);
      if (!existingRaw) {
        console.log(`ℹ️ No local snapshots found for room ${roomId}`);
        return;
      }
      const existing: any[] = JSON.parse(existingRaw);
      const last = existing[existing.length - 1];
      if (!last) {
        console.log('ℹ️ Snapshot array is empty');
        return;
      }
      console.log(`♻️ Restoring snapshot for room ${roomId}...`, {
        objectCount: last.state.objects?.length || 0,
        savedAt: new Date(last.timestamp).toLocaleTimeString(),
        totalSnapshots: existing.length
      });
      isLoadingStateRef.current = true;
      canvas.loadFromJSON(last.state, () => {
        canvas.renderAll();
        isLoadingStateRef.current = false;
        console.log(`✅ Restored latest local snapshot (${last.state.objects?.length || 0} objects)`);
      });
    } catch(err) {
      console.error('❌ Failed to restore snapshot:', err);
      isLoadingStateRef.current = false;
    }
  }, [roomId]);

  // Expose restore via window event
  useEffect(() => {
    const handler = (ev: any) => {
      console.log('🎯 Restore event received:', { 
        eventRoomId: ev.detail?.roomId, 
        componentRoomId: roomId,
        match: ev.detail?.roomId == roomId || ev.detail?.roomId === `canvas-room-${roomId}`
      });
      // Accept both numeric roomId and "canvas-room-X" format
      if (ev.detail?.roomId && 
          ev.detail.roomId != roomId && 
          ev.detail.roomId !== `canvas-room-${roomId}`) {
        console.log('⏭️ Skipping restore - room ID mismatch');
        return;
      }
      console.log('✅ Calling restoreLatestSnapshot...');
      restoreLatestSnapshot();
    };
    window.addEventListener('collab:restore-latest', handler as any);
    return () => window.removeEventListener('collab:restore-latest', handler as any);
  }, [restoreLatestSnapshot, roomId]);

  // Expose clear canvas via window event
  useEffect(() => {
    const handler = (ev: any) => {
      console.log('🗑️ Clear canvas event received:', { 
        eventRoomId: ev.detail?.roomId, 
        componentRoomId: roomId 
      });
      if (ev.detail?.roomId && 
          ev.detail.roomId != roomId && 
          ev.detail.roomId !== `canvas-room-${roomId}`) {
        console.log('⏭️ Skipping clear - room ID mismatch');
        return;
      }
      
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      isLoadingStateRef.current = true;
      const objects = canvas.getObjects();
      
      // Remove all objects
      canvas.remove(...objects);
      canvas.renderAll();
      
      // Send clear event to other users
      sendDrawingEvent({
        type: 'canvas-cleared',
        data: {},
        userId: collabUserId
      });
      
      isLoadingStateRef.current = false;
      console.log('✅ Canvas cleared');
    };
    window.addEventListener('collab:clear-canvas', handler as any);
    return () => window.removeEventListener('collab:clear-canvas', handler as any);
  }, [roomId, collabUserId, sendDrawingEvent]);

  // Apply tool settings when they change
  useEffect(() => {
    applyToolSettings();
  }, [applyToolSettings]);

  // Manage event handlers separately to avoid canvas remounting
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || readOnly) return;

    // Remove existing handlers first
    canvas.off('path:created');
    canvas.off('object:added');
    canvas.off('object:modified');
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    // Reattach handlers
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    console.log('🔄 Reattached canvas event handlers');
  }, [handlePathCreated, handleObjectAdded, handleObjectModified, handleMouseDown, handleMouseMove, handleMouseUp, readOnly]);

  // Auto-save canvas state
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !roomId || !userId) return;

    const autoSave = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const canvasJSON = canvas.toJSON(['_cid', 'createdBy', 'createdByName', 'createdByColor']);
        dispatch(saveCanvasState({ 
          roomId, 
          state: canvasJSON 
        }));
      }, 2000);
    };

    canvas.on('object:added', autoSave);
    canvas.on('object:removed', autoSave);
    canvas.on('object:modified', autoSave);

    return () => {
      canvas.off('object:added', autoSave);
      canvas.off('object:removed', autoSave);
      canvas.off('object:modified', autoSave);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [roomId, userId, dispatch]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-100">
      {/* Connection Status */}
      <ConnectionStatus
        isConnected={isConnected}
        error={collabError}
        userId={collabUserId}
      />

      {/* Loading overlay */}
      {isCanvasLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading canvas...</p>
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-4"
      >
        <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
          <canvas 
            ref={canvasRef}
            className="block"
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              cursor: activeTool === 'pan' ? 'grab' : 'default'
            }}
          />
          
          {/* Real-time cursor overlay */}
          <CursorOverlay
            cursors={cursors}
            containerRef={containerRef}
            userId={collabUserId}
          />
        </div>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
          <div>Room: canvas-room-{roomId}</div>
          <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
          <div>Cursors: {cursors.size}</div>
          <div>Tool: {activeTool}</div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeFigmaCanvas;