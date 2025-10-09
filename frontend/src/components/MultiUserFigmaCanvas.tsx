/**
 * DEPRECATED COMPONENT
 * MultiUserFigmaCanvas has been superseded by CursorsOnlyFigmaCanvas with integrated
 * multi-cursor + stroke streaming. This file is retained temporarily for reference
 * and will be removed after validation. Do not import in new code.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { fabric } from 'fabric';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addOperation, saveCanvasState, fetchCanvas, clearOperations, fetchCanvasHistory } from '../store/slices/canvasSlice';
import { createCanvasSocket } from '../services/socket';
import { useMultiUserSimulation } from '../hooks/useMultiUserSimulation';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import CursorOverlay from './CursorOverlay';
import UserSelector from './UserSelector';
import roomLoadingManager from '../services/roomLoadingManager';
import { socketUrl } from '../config/environment';
import { SocketEvents } from '../utils/constants';

interface MultiUserFigmaCanvasProps {
  roomId: number;
  /** Optional initial width fallback (will be overridden by responsive sizing) */
  width?: number;
  /** Optional initial height fallback (will be overridden by responsive sizing) */
  height?: number;
  readOnly?: boolean;
}

/**
 * MULTI-USER FIGMA-STYLE CANVAS COMPONENT
 * Combines FigmaStyleCanvas with multi-user simulation capabilities
 * 
 * Key features:
 * 1. Multiple simulated users with distinct identities
 * 2. User switching with keyboard shortcuts
 * 3. Cursor tracking and visualization
 * 4. User action attribution
 * 5. Full canvas functionality from FigmaStyleCanvas
 */
const MultiUserFigmaCanvas: React.FC<MultiUserFigmaCanvasProps> = ({ 
  roomId, 
  width: initialWidth = 1200, 
  height: initialHeight = 800, 
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
  const { currentCanvas } = useAppSelector((state) => state.canvas);
  // Real-time participants from socket (Redux) for robust cursor names
  const activeSocketUsers = useAppSelector((state: any) => state.canvas.activeUsers || []);

  // Tool state from Redux
  const activeTool = useAppSelector(state => (state.canvas as any).activeTool || 'pencil') as string;
  const brushSize = useAppSelector(state => (state.canvas as any).brushSize || 5) as number;
  const brushColor = useAppSelector(state => (state.canvas as any).brushColor || '#000000') as string;

  // --- Progressive stroke streaming (ported) ---
  const strokeActiveRef = useRef(false);
  const strokeIdRef = useRef<string | null>(null);
  const strokePointsBufferRef = useRef<Array<{ x: number; y: number; dt?: number }>>([]);
  const strokeAllPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const strokeLastTsRef = useRef<number>(0);
  const strokeTotalPointsRef = useRef<number>(0);
  const strokeSeqRef = useRef<number>(0);
  const strokeRafRef = useRef<number | null>(null);
  const remoteStrokeRenderScheduledRef = useRef(false);
  const remoteStrokesRef = useRef<Record<string, fabric.Path>>({});
  const genStrokeId = () => `stk-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  const emitStrokeBegin = useCallback((x: number, y: number) => {
    if (!socketRef.current?.isConnected()) return;
    const strokeId = genStrokeId();
    strokeIdRef.current = strokeId;
    strokeActiveRef.current = true;
    strokePointsBufferRef.current = [];
    strokeAllPointsRef.current = [{ x, y }];
    strokeSeqRef.current = 0;
    strokeTotalPointsRef.current = 0;
    strokeLastTsRef.current = performance.now();
    socketRef.current.emitStrokeBegin({ strokeId, color: brushColor, size: brushSize, tool: 'pencil', start: { x, y } });
  }, [brushColor, brushSize]);

  const flushStrokePoints = useCallback((force = false) => {
    if (!strokeActiveRef.current || !socketRef.current?.isConnected()) return;
    const buf = strokePointsBufferRef.current;
    if (!buf.length) return;
    if (!force) {
      const now = performance.now();
      const elapsed = now - strokeLastTsRef.current;
      if (buf.length < 8 && elapsed < 16) return;
      strokeLastTsRef.current = now;
    }
    socketRef.current.emitStrokePoints({ strokeId: strokeIdRef.current!, points: buf.splice(0, buf.length), seq: strokeSeqRef.current++ });
  }, []);

  const strokeAnimationLoop = useCallback(() => {
    if (!strokeActiveRef.current) { strokeRafRef.current = null; return; }
    flushStrokePoints(false);
    strokeRafRef.current = requestAnimationFrame(strokeAnimationLoop);
  }, [flushStrokePoints]);

  const endStroke = useCallback((cancel = false) => {
    if (!strokeActiveRef.current || !socketRef.current?.isConnected()) return;
    flushStrokePoints(true);
    const strokeId = strokeIdRef.current!;
    const totalPoints = strokeTotalPointsRef.current;
    const canvas = fabricCanvasRef.current;
    if (cancel) {
      socketRef.current.emitStrokeCancel({ strokeId, reason: 'tool-switch' });
    } else {
      const raw = strokeAllPointsRef.current;
      let smoothed = raw;
      if (raw.length > 4) {
        const win = 3;
        smoothed = raw.map((p, i) => {
          if (i === 0 || i === raw.length - 1) return p;
          const start = Math.max(0, i - Math.floor(win / 2));
          const end = Math.min(raw.length - 1, i + Math.floor(win / 2));
          let sx = 0, sy = 0, c = 0;
          for (let j = start; j <= end; j++) { sx += raw[j].x; sy += raw[j].y; c++; }
          return { x: sx / c, y: sy / c };
        });
      }
      if (canvas) {
        const objects = canvas.getObjects();
        const last = objects[objects.length - 1];
        if (last && last.type === 'path') {
          (last as fabric.Path).set({ path: smoothed.map((p,i)=> i===0? ['M',p.x,p.y]: ['L',p.x,p.y]) as any });
          (last as any).strokeId = strokeId;
          (last as any).set({ selectable: true, evented: true, opacity: 1 });
          canvas.requestRenderAll();
        }
      }
      socketRef.current.emitStrokeEnd({
        strokeId,
        totalPoints,
        pathData: { type: 'path', path: smoothed.map((p,i)=> i===0? ['M',p.x,p.y]: ['L',p.x,p.y]), stroke: brushColor, strokeWidth: brushSize, fill: 'transparent' },
        color: brushColor,
        size: brushSize,
        tool: 'pencil'
      });
    }
    strokeActiveRef.current = false;
    strokeIdRef.current = null;
    strokePointsBufferRef.current = [];
    strokeAllPointsRef.current = [];
    if (strokeRafRef.current) { cancelAnimationFrame(strokeRafRef.current); strokeRafRef.current = null; }
  }, [flushStrokePoints, brushColor, brushSize]);

  // Multi-user simulation hook
  const {
    users,
    activeUserId,
    cursorPositions,
    showAllCursors,
    getActiveUser,
    setActiveUser,
    updateCursorPosition,
    addUserAction,
    switchToNextUser,
    switchToPreviousUser,
    switchToUserByNumber,
    toggleShowAllCursors,
    cleanup: cleanupMultiUser
  } = useMultiUserSimulation();

  // Keyboard shortcuts for multi-user simulation
  useKeyboardShortcuts({
    onSwitchToUser: switchToUserByNumber,
    onNextUser: switchToNextUser,
    onPreviousUser: switchToPreviousUser,
    onToggleCursors: toggleShowAllCursors,
    isEnabled: true,
    maxUsers: users.length
  });

  // Responsive dimensions state (overrides provided width/height after mount)
  const [canvasDimensions, setCanvasDimensions] = useState({ width: initialWidth, height: initialHeight });

  // UI state
  const [isUserSelectorVisible, setIsUserSelectorVisible] = useState(true);
  // Sync controls state (reintroduce UI for manual / auto syncing)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastManualSyncTs, setLastManualSyncTs] = useState<number | null>(null);
  // DOM cursor refs for real-time users
  const realtimeCursorsRef = useRef<Record<string, HTMLElement>>({});
  // Hash of last persisted canvas JSON to avoid redundant saves
  const lastCanvasHashRef = useRef<string | null>(null);

  const computeCanvasHash = useCallback((json: any) => {
    try {
      const str = typeof json === 'string' ? json : JSON.stringify(json);
      // Simple FNV-1a hash
      let h = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h >>> 0) * 0x01000193;
      }
      return ('00000000' + (h >>> 0).toString(16)).slice(-8);
    } catch { return Math.random().toString(36).slice(2,10); }
  }, []);

  // Utility: stable color per user (id or username)
  const getUserColor = useCallback((identifier: string | number) => {
    const str = String(identifier);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    return `hsl(${hue},70%,55%)`;
  }, []);

  // Robust real-time cursor layer fed by Redux activeUsers + their cursorPosition
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const visible = showAllCursors; // reuse existing toggle

    const existingKeys = new Set(Object.keys(realtimeCursorsRef.current));
    const activeKeys = new Set<string>();

    activeSocketUsers.forEach((u: any) => {
      const key = `rt-${u.userId}`;
      activeKeys.add(key);
      if (!realtimeCursorsRef.current[key]) {
        const el = document.createElement('div');
        el.className = 'rt-user-cursor';
        el.style.cssText = 'position:absolute;pointer-events:none;z-index:9998;transform:translate(-50%, -50%);transition:transform 40ms linear;';
        const icon = document.createElement('div');
        icon.textContent = '▣';
        icon.style.cssText = 'font-size:14px;filter:drop-shadow(0 0 2px rgba(0,0,0,0.4));';
        const label = document.createElement('div');
        const displayName = u.username || `User ${u.userId}`;
        const color = getUserColor(displayName);
        label.textContent = displayName;
        label.style.cssText = `margin-top:6px;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;color:#fff;white-space:nowrap;background:${color};box-shadow:0 2px 4px rgba(0,0,0,0.25);`; 
        el.appendChild(icon);
        el.appendChild(label);
        // Start off-screen until first position
        el.style.left = '-1000px';
        el.style.top = '-1000px';
        el.style.display = visible ? 'block' : 'none';
        container.appendChild(el);
        realtimeCursorsRef.current[key] = el;
      } else {
        // Update label if changed
        const el = realtimeCursorsRef.current[key];
        const label = el.children[1] as HTMLElement | undefined;
        const displayName = u.username || `User ${u.userId}`;
        if (label && label.textContent !== displayName) {
          const color = getUserColor(displayName);
          label.textContent = displayName;
          label.style.background = color;
        }
        el.style.display = visible ? 'block' : 'none';
      }

      // Position update (if available)
      if (u.cursorPosition) {
        const el = realtimeCursorsRef.current[key];
        el.style.left = `${u.cursorPosition.x}px`;
        el.style.top = `${u.cursorPosition.y}px`;
      }
    });

    // Self cursor (ensure appears even if not in activeSocketUsers yet)
    if (user?.id) {
      const key = `rt-self-${user.id}`;
      activeKeys.add(key);
      if (!realtimeCursorsRef.current[key]) {
        const selfEl = document.createElement('div');
        selfEl.className = 'rt-user-cursor self';
        selfEl.style.cssText = 'position:absolute;pointer-events:none;z-index:9999;transform:translate(-50%, -50%);';
        const icon = document.createElement('div');
        icon.textContent = '▲';
        icon.style.cssText = 'font-size:15px;filter:drop-shadow(0 0 2px rgba(0,0,0,0.4));';
        const label = document.createElement('div');
        const displayName = user.username || user.name || 'You';
        const color = getUserColor(`self-${user.id}`);
        label.textContent = displayName;
        label.style.cssText = `margin-top:6px;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;color:#fff;white-space:nowrap;background:${color};box-shadow:0 2px 4px rgba(0,0,0,0.25);`;
        selfEl.appendChild(icon);
        selfEl.appendChild(label);
        selfEl.style.left = '-1000px';
        selfEl.style.top = '-1000px';
        selfEl.style.display = visible ? 'block' : 'none';
        container.appendChild(selfEl);
        realtimeCursorsRef.current[key] = selfEl;
      } else {
        realtimeCursorsRef.current[key].style.display = visible ? 'block' : 'none';
      }
    }

    // Remove stale DOM nodes
    existingKeys.forEach(k => {
      if (!activeKeys.has(k)) {
        const el = realtimeCursorsRef.current[k];
        if (el) el.remove();
        delete realtimeCursorsRef.current[k];
      }
    });

    return () => {
      // Do not clean entire layer here; we manage lifecycle on unmount below
    };
  }, [activeSocketUsers, showAllCursors, user, getUserColor]);

  // Update self cursor position locally for responsiveness
  const updateSelfCursor = useCallback((x: number, y: number) => {
    if (!user?.id) return;
    const el = realtimeCursorsRef.current[`rt-self-${user.id}`];
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }, [user?.id]);

  // Optimized tool settings application with debouncing
  const applyToolSettings = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Get active user for info, but PRIORITIZE Redux brush color for consistency
    const activeUser = getActiveUser();
    // Use Redux brushColor for consistency with CursorsOnly mode
    const effectiveColor = brushColor;

    // Skip if already applying the same tool settings
    const currentSettings = `${activeTool}-${brushSize}-${effectiveColor}`;
    if ((canvas as any)._lastToolSettings === currentSettings) {
      return;
    }
    
    console.log('🛠️ MultiUser: Applying tool settings:', { 
      activeTool, 
      brushSize, 
      effectiveColor, 
      user: activeUser?.name,
      reduxColor: brushColor 
    });
    
    // Store settings to prevent duplicate applications
    (canvas as any)._lastToolSettings = currentSettings;

    // Batch canvas updates to reduce renders
    canvas.skipTargetFind = activeTool !== 'select';
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    canvas.moveCursor = 'move';

    // Set brush properties once - USE REDUX COLOR for consistency
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = effectiveColor; // Use Redux brush color consistently
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
          canvas.freeDrawingBrush.color = effectiveColor; // Use consistent color (should be white for eraser)
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
  }, [activeTool, brushSize, brushColor, getActiveUser]);

  // Apply tool settings when they change or user changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyToolSettings();
    }, 50); // 50ms debounce for smoother tool switching

    return () => clearTimeout(timeoutId);
  }, [activeTool, brushSize, brushColor, activeUserId, applyToolSettings]);

  // Shape creation functions - WITH USER COLOR
  const createShape = useCallback((startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, shapeType: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

    // Use Redux brush color for consistency with CursorsOnly mode
    const activeUser = getActiveUser();
    const effectiveColor = brushColor; // Prioritize Redux state over user color
    
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);

    const shapeOptions = {
      left,
      top,
      fill: 'transparent',
      stroke: effectiveColor, // Use Redux brush color consistently
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
          stroke: effectiveColor, // Use Redux brush color consistently
          strokeWidth: Math.max(1, brushSize / 5),
        });

        const arrowHead = new fabric.Triangle({
          width: 10,
          height: 10,
          fill: effectiveColor, // Use Redux brush color consistently
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
    if (shape && activeUser) {
      (shape as any).createdBy = activeUser.id;
      (shape as any).createdByName = activeUser.name;
      (shape as any).createdByColor = activeUser.color;
    }

    return shape;
  }, [brushSize, brushColor, getActiveUser]);

  // Optimized mouse event handlers with performance improvements
  const handleMouseDown = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    // Update cursor position for multi-user simulation
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.e.clientX - rect.left;
      const y = e.e.clientY - rect.top;
      updateCursorPosition(x, y);
      updateSelfCursor(x, y);
    }

    // Get active user
    const activeUser = getActiveUser();
    if (!activeUser) return;

    // Handle different tools with minimal processing
    switch (activeTool) {
      case 'text':
        // Create text object at click position with user color
        const text = new fabric.IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Arial',
          fontSize: Math.max(12, brushSize * 2),
          fill: activeUser.color, // Use active user's color
          selectable: true,
          evented: true,
        });
        
        // Add user attribution
        (text as any).createdBy = activeUser.id;
        (text as any).createdByName = activeUser.name;
        (text as any).createdByColor = activeUser.color;
        
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        
        // Add user action for multi-user tracking
        addUserAction('create', {
          objectType: 'text',
          objectId: Date.now(),
          properties: text.toObject()
        }, { x: pointer.x, y: pointer.y });
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
      case 'pencil':
        // Begin streaming stroke
        emitStrokeBegin(pointer.x, pointer.y);
        strokeRafRef.current = requestAnimationFrame(strokeAnimationLoop);
        break;

      case 'pan':
        // Enable canvas panning with minimal state changes
        panStateRef.current.isDragging = true;
        canvas.selection = false;
        panStateRef.current.lastPosX = e.e.clientX;
        panStateRef.current.lastPosY = e.e.clientY;
        break;
    }
  }, [activeTool, brushSize, getActiveUser, updateCursorPosition, addUserAction]);

  const handleMouseMove = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    // Update cursor position for multi-user simulation
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.e.clientX - rect.left;
      const y = e.e.clientY - rect.top;
      updateCursorPosition(x, y);
      updateSelfCursor(x, y);
    }

    if (activeTool === 'pencil' && strokeActiveRef.current) {
      const now = performance.now();
      const dt = strokeLastTsRef.current ? now - strokeLastTsRef.current : 0;
      strokePointsBufferRef.current.push({ x: pointer.x, y: pointer.y, dt: Math.round(dt) });
      strokeAllPointsRef.current.push({ x: pointer.x, y: pointer.y });
      strokeTotalPointsRef.current += 1;
      // Let RAF loop handle flushing
    } else if (activeTool === 'pan' && panStateRef.current.isDragging) {
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
  }, [activeTool, updateCursorPosition, createShape]);

  const handleMouseUp = useCallback((e: fabric.IEvent<MouseEvent>) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    if (activeTool === 'pencil' && strokeActiveRef.current) {
      endStroke(false);
    } else if (activeTool === 'pan') {
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
        
        // Add user action for multi-user tracking
        const activeUser = getActiveUser();
        if (activeUser) {
          addUserAction('create', {
            objectType: activeTool,
            objectId: Date.now(),
            properties: shape.toObject()
          }, { x: pointer.x, y: pointer.y });
        }
      }

      // Reset shape drawing state
      isDrawingShapeRef.current = false;
      shapeStartPointRef.current = null;
      currentShapeRef.current = null;
    }
  }, [activeTool, createShape, getActiveUser, addUserAction]);

  // Debounced save function with room isolation
  const debouncedSave = useCallback(() => {
    if (isLoadingStateRef.current) {
      console.log('🛑 MultiUser: Skipping save - currently loading state');
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isLoadingStateRef.current) {
        console.log('🛑 MultiUser: Save cancelled - no canvas or loading state');
        return;
      }
      
      const canvasState = canvas.toJSON();
      const hash = computeCanvasHash(canvasState);
      if (lastCanvasHashRef.current === hash) {
        console.log('⏩ MultiUser: Skipping save (no changes since last hash)', hash);
        return;
      }
      lastCanvasHashRef.current = hash;
      console.log(`💾 MultiUser: Auto-saving canvas state for room ${roomId}...`, { hash });
      
      // Only save if we have a valid current canvas context
      if (currentCanvas && currentCanvas.roomId === roomId) {
        dispatch(saveCanvasState({
          roomId,
          state: canvasState
        }));
      } else {
        console.warn(`⚠️ MultiUser: Skipping save - room mismatch (current: ${currentCanvas?.roomId}, expected: ${roomId})`);
      }
    }, 5000); // Increased to 5 seconds to reduce save frequency
  }, [roomId, dispatch, currentCanvas]);

  // Immediate flush save (used on unmount / unload)
  const flushSave = useCallback(() => {
    if (isLoadingStateRef.current) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const canvasState = canvas.toJSON();
    if (currentCanvas && currentCanvas.roomId === roomId) {
      dispatch(saveCanvasState({ roomId, state: canvasState }));
    }
  }, [roomId, dispatch, currentCanvas]);

  // Manual sync trigger (placeholder - currently reuses flushSave)
  const handleManualSync = useCallback(() => {
    console.log('🔄 Manual sync triggered');
    flushSave();
    setLastManualSyncTs(Date.now());
  }, [flushSave]);

  // Auto-sync interval when enabled (lightweight)
  useEffect(() => {
    if (!autoSyncEnabled) return;
    const id = setInterval(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isLoadingStateRef.current) return;
      const json = canvas.toJSON();
      const hash = computeCanvasHash(json);
      if (lastCanvasHashRef.current === hash) {
        // No changes – skip scheduling a full save
        return;
      }
      // Schedule save via debounced pipeline
      debouncedSave();
    }, 3000); // every 3s
    return () => clearInterval(id);
  }, [autoSyncEnabled, debouncedSave, computeCanvasHash]);
  
  // Load canvas state from database using singleton manager
  const loadCanvasState = useCallback(async () => {    
    console.log('� MultiUser: loadCanvasState called for room:', roomId);
    
    try {
      await roomLoadingManager.loadRoom(
        roomId,
        async () => {
          console.log('� MultiUser: Executing actual load operations for room:', roomId);
          
          // Clear operations first
          dispatch(clearOperations());
          
          // Then fetch canvas and history
          await dispatch(fetchCanvas(roomId));
          await dispatch(fetchCanvasHistory({ roomId }));
          
          return { success: true };
        },
        'MultiUserFigmaCanvas'
      );
      
      console.log('✅ MultiUser: Room loading completed successfully');
    } catch (error) {
      console.error('❌ MultiUser: Room loading failed:', error);
    }
  }, [roomId, dispatch]);

  // Clear canvas when room changes to fix cross-room sharing - MOVED HERE
  useEffect(() => {
    if (currentRoomIdRef.current !== null && currentRoomIdRef.current !== roomId) {
      console.log(`🧹 MultiUser: Room changed from ${currentRoomIdRef.current} to ${roomId}, clearing canvas`);
      
      // Cancel any ongoing loading for the old room
      roomLoadingManager.cancelRoomLoading(currentRoomIdRef.current, 'Room changed');
      
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
        console.log('🔌 MultiUser: Disconnecting old socket for room change');
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
      console.log('🛑 MultiUser: Skipping path creation - loading state');
      return;
    }

    // Get active user for attribution
    const activeUser = getActiveUser();
    if (!activeUser) return;

    console.log('✏️ MultiUser: Path created by', activeUser.name);
    
    // Set path color to user color
    if (e.path) {
      e.path.set({
        stroke: activeUser.color,
        fill: 'transparent'
      });
      
      // Add user attribution to path
      (e.path as any).createdBy = activeUser.id;
      (e.path as any).createdByName = activeUser.name;
      (e.path as any).createdByColor = activeUser.color;
    }

    // Create operation for socket transmission and Redux
    const operation = {
      objectType: 'path',
      objectData: {
        pathData: e.path?.toJSON() || {},
        timestamp: Date.now(),
        createdBy: activeUser.id,
        createdByName: activeUser.name,
        createdByColor: activeUser.color
      },
      action: 'added'
    };

    // Add user action for multi-user tracking
    addUserAction('draw', {
      pathData: e.path?.path,
      stroke: activeUser.color,
      strokeWidth: brushSize
    });

    // Dispatch to Redux with proper room isolation and user attribution
    dispatch(addOperation({
      id: Date.now(),
      objectType: 'path',
      objectData: operation.objectData,
      action: 'added',
      createdAt: new Date().toISOString(),
      canvasId: currentCanvas?.id || roomId,
      userId: Number(activeUser.id) // Convert string ID to number
    }));

    // Emit via socket
    console.log('🔍 MultiUser: Checking socket connection state:', {
      hasSocket: !!socketRef.current,
      isConnected: socketRef.current?.isConnected(),
      activeUser: activeUser.name,
      isLoadingState: isLoadingStateRef.current
    });
    
    if (socketRef.current?.isConnected()) {
      console.log('🚀 MultiUser: Emitting drawing operation for', activeUser.name);
      socketRef.current.emitDrawingOperation(operation);
    } else {
      console.log('⚠️ MultiUser: Socket not connected, operation not emitted');
    }

    // Auto-save canvas state to database (debounced)
    debouncedSave();
  }, [roomId, dispatch, debouncedSave, getActiveUser, addUserAction, brushSize]);

  const handleObjectAdded = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;
    
    // Get active user for attribution (if not already set)
    const activeUser = getActiveUser();
    if (!activeUser) return;
    
    const obj = e.target;
    if (obj && !(obj as any).createdBy) {
      console.log(`➕ MultiUser: Object added by ${activeUser.name} (${obj?.type})`);
      
      // Add user attribution if not already present
      (obj as any).createdBy = activeUser.id;
      (obj as any).createdByName = activeUser.name;
      (obj as any).createdByColor = activeUser.color;
      
      // Update object appearance to match user color
      if (obj.stroke !== undefined) {
        obj.set({
          stroke: activeUser.color
        });
      }
      
      if (obj.fill !== undefined && obj.fill !== 'transparent') {
        obj.set({
          fill: activeUser.color + '40' // Semi-transparent
        });
      }

      canvas.requestRenderAll();
    }
    
    // Skip objects that are stroke-streaming paths (tagged with strokeId) or free drawing paths handled in handlePathCreated
    const addedObj = e.target;
    if (addedObj && (addedObj as any).strokeId) {
      debouncedSave();
      return; // Already emitted via stroke streaming
    }

    // Emit creation for shapes/text (non-path free drawing) instantly if socket connected
    if (addedObj && socketRef.current?.isConnected() && addedObj.type !== 'path') {
      const serialized = addedObj.toObject(['data']);
      const operation = {
        objectType: addedObj.type,
        objectData: serialized,
        action: 'added'
      } as any;
      socketRef.current.emitDrawingOperation(operation);
    }

    debouncedSave();
  }, [debouncedSave, getActiveUser]);

  const handleObjectRemoved = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingStateRef.current) return;
    
    const activeUser = getActiveUser();
    if (!activeUser) return;
    
    console.log(`🗑️ MultiUser: Object removed by ${activeUser.name}`);
    
    // Add user action for multi-user tracking
    addUserAction('delete', {
      objectType: e.target?.type || 'unknown',
      timestamp: Date.now()
    });
    
    // Emit delete operation if socket connected (exclude streaming cleanup removes with strokeId if needed)
    if (socketRef.current?.isConnected() && e.target) {
      const removedObj = e.target;
      const operation = {
        objectType: removedObj.type,
        objectData: { _cid: (removedObj as any)._cid },
        action: 'removed'
      } as any;
      socketRef.current.emitDrawingOperation(operation);
    }

    debouncedSave();
  }, [debouncedSave, getActiveUser, addUserAction]);

  // Responsive sizing effect (ResizeObserver)
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Account for toolbar + status bar heights (approx) and padding
      const verticalChrome = 90; // toolbar + bottom bar + margins
      const newWidth = Math.max(400, rect.width - 4);
      const newHeight = Math.max(300, rect.height - verticalChrome);
      setCanvasDimensions(prev => {
        if (prev.width === newWidth && prev.height === newHeight) return prev;
        return { width: newWidth, height: newHeight };
      });
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.setDimensions({ width: newWidth, height: newHeight });
        fabricCanvasRef.current.requestRenderAll();
      }
    };

    // Initial measure after mount tick
    const raf = requestAnimationFrame(updateSize);
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Canvas initialization - ONLY ONCE (uses responsive dimensions)
  useEffect(() => {
    if (isInitializedRef.current || !canvasRef.current) return;
    console.log('🎨 MultiUser: Initializing canvas (one-time only)');
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasDimensions.width,
      height: canvasDimensions.height,
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
  console.log('🎨 MultiUser: Canvas ready with dimensions:', { width: canvasDimensions.width, height: canvasDimensions.height });

    // Attach stable event handlers
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    
    // Attach mouse event handlers for shape creation and interaction
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    console.log('✅ MultiUser: Canvas initialization complete');

    // Note: Canvas state loading is now handled by the socket connection useEffect
    // This ensures loading happens only after socket is connected

    // Cleanup function
    return () => {
      console.log('🧹 MultiUser: Component unmounting, disposing canvas');
      // Flush pending save synchronously before disposal
      try { flushSave(); } catch {}
      
      // Cancel any ongoing loading for this room
      roomLoadingManager.cancelRoomLoading(roomId, 'Component unmounting');
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Clean up refs
      isInitializedRef.current = false;
      lastRestoredStateRef.current = null;
      isLoadingStateRef.current = false;
      
      // Clean up multi-user resources
      cleanupMultiUser();
      
      // Dispose canvas
      canvas.dispose();
    };
  }, [canvasDimensions.width, canvasDimensions.height, readOnly]); // run once; dimensions stable after first set

  // Flush on tab/window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      try { flushSave(); } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushSave]);

  // Socket connection management with stable useEffect
  useEffect(() => {
    // Skip if missing required data or read-only mode
    if (!user || readOnly) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    console.log('🔌 MultiUser: Initializing stable socket connection for room:', roomId);
    
    // Clean up any existing connection
    if (socketRef.current) {
      console.log('🧹 MultiUser: Cleaning up previous socket connection');
      socketRef.current.disconnect();
    }

    // Create socket connection
    socketRef.current = createCanvasSocket({
      url: socketUrl,
      roomId,
      userId: user.id,
      token,
      dispatch,
    });

    // Connect after a small delay
    const timeoutId = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.connect();
        console.log('✅ MultiUser: Socket connected for room:', roomId);
        
        // Load canvas state once socket is connected
        loadCanvasState();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (socketRef.current) {
        console.log('🧹 MultiUser: Disconnecting socket for room:', roomId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId]); // Only re-run when roomId changes

  // Canvas state restoration from database - STABLE VERSION  
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentCanvas?.state || isLoadingStateRef.current) {
      return;
    }
    
    // Prevent restoring the same state multiple times
    const stateString = JSON.stringify(currentCanvas.state);
    if (lastRestoredStateRef.current === stateString) {
      console.log('🛑 MultiUser: State already restored, skipping');
      return;
    }

    console.log('📥 MultiUser: Restoring canvas state from database...');
    isLoadingStateRef.current = true;
    lastRestoredStateRef.current = stateString;
    
    try {
      // Temporarily disable ALL event handlers during loading
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      
      canvas.loadFromJSON(currentCanvas.state, () => {
        const objectCount = canvas.getObjects().length;
        console.log(`✅ MultiUser: Canvas state restored! Objects: ${objectCount}`);
        
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
      console.error('❌ MultiUser: Failed to restore canvas state:', error);
      
      // Re-enable event handlers even on error
      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);
      canvas.on('object:removed', handleObjectRemoved);
      isLoadingStateRef.current = false;
      lastRestoredStateRef.current = null; // Allow retry
    }
  }, [currentCanvas?.state, handlePathCreated, handleObjectAdded, handleObjectRemoved, applyToolSettings]);

  // Handle cursor tracking in the container
  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateCursorPosition(x, y, containerRef.current);
    updateSelfCursor(x, y);
  }, [updateCursorPosition]);

  const toggleUserSelector = () => {
    setIsUserSelectorVisible(!isUserSelectorVisible);
  };

  // Clear canvas handler
  const handleClearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || readOnly) return;

    console.log('🧹 MultiUser: Manual clear requested');
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    
    // Add user action for multi-user tracking
    addUserAction('delete', {
      action: 'clear',
      timestamp: Date.now()
    });
    
    // Auto-save after clearing
    debouncedSave();
  };

  // Get active user for display
  const activeUser = getActiveUser();

  // Receive legacy/operation events for shapes & paths (non-streaming) and apply to canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const handleDrawingEvent = (operation: any) => {
      try {
        const { objectType, objectData, action, userId: opUserId } = operation || {};
        // Skip own
        if (opUserId && user && String(opUserId) === String(user.id)) return;
        if (action === 'added' && objectType && objectData) {
          fabric.util.enlivenObjects([objectData], (objs: fabric.Object[]) => {
            const obj = objs[0];
            if (obj) {
              // Avoid duplicating stroke streaming paths
              if ((obj as any).strokeId && Object.values(remoteStrokesRef.current).some(p => (p as any).strokeId === (obj as any).strokeId)) return;
              canvas.add(obj);
              canvas.requestRenderAll();
            }
          }, 'fabric');
        } else if ((action === 'removed' || action === 'delete') && objectData?._cid) {
          const target = canvas.getObjects().find(o => (o as any)._cid === objectData._cid);
          if (target) { canvas.remove(target); canvas.requestRenderAll(); }
        }
      } catch (err) {
        console.warn('⚠️ MultiUser: Failed applying drawing event', err);
      }
    };

    const handleInstant = (e: any) => {
      const { drawingData, action, userId: opUserId } = e.detail || {};
      if (opUserId && user && String(opUserId) === String(user.id)) return;
      if (action === 'path_created' && drawingData?.pathData) {
        fabric.util.enlivenObjects([drawingData.pathData], (objs: fabric.Object[]) => {
          const obj = objs[0]; if (!obj) return;
          if ((obj as any).strokeId && Object.values(remoteStrokesRef.current).some(p => (p as any).strokeId === (obj as any).strokeId)) return;
          canvas.add(obj); canvas.requestRenderAll();
        }, 'fabric');
      } else if (action === 'object_added' && drawingData?.objectData) {
  fabric.util.enlivenObjects([drawingData.objectData], (objs: fabric.Object[]) => { const obj = objs[0]; if (obj) { canvas.add(obj); canvas.requestRenderAll(); } }, 'fabric');
      }
    };

    // Attach socket-level listener if socket exists
    const socket = socketRef.current?.socket;
    if (socket) {
      socket.on(SocketEvents.DRAWING_EVENT, handleDrawingEvent);
    }
    window.addEventListener('INSTANT_DRAWING', handleInstant as any);
    return () => {
      if (socket) socket.off(SocketEvents.DRAWING_EVENT, handleDrawingEvent);
      window.removeEventListener('INSTANT_DRAWING', handleInstant as any);
    };
  }, [user]);

  // Remote stroke rendering listeners
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const handleStrokeBegin = (e: any) => {
      const p = e.detail; if (!p || !p.strokeId) return;
      if (remoteStrokesRef.current[p.strokeId]) return;
      const path = new fabric.Path(`M ${p.start.x} ${p.start.y}`, { stroke: p.color || '#000', strokeWidth: p.size || 2, fill: 'transparent', selectable:false, evented:false, strokeLineCap:'round', strokeLineJoin:'round' });
      remoteStrokesRef.current[p.strokeId] = path;
      canvas.add(path);
    };
    const handleStrokePoint = (e: any) => {
      const d = e.detail; if (!d || !d.strokeId || !Array.isArray(d.points)) return;
      const path = remoteStrokesRef.current[d.strokeId]; if (!path) return;
      const arr: any[] = (path.path as any[]) || [];
      d.points.forEach((pt: any) => { arr.push(['L', pt.x, pt.y]); });
      path.set({ path: arr as any });
      if (!remoteStrokeRenderScheduledRef.current) {
        remoteStrokeRenderScheduledRef.current = true;
        requestAnimationFrame(()=>{ remoteStrokeRenderScheduledRef.current = false; canvas.requestRenderAll(); });
      }
    };
    const handleStrokeEnd = (e: any) => {
      const d = e.detail; if (!d?.strokeId) return; const path = remoteStrokesRef.current[d.strokeId];
      if (path) {
        if (d.pathData?.path && Array.isArray(d.pathData.path)) {
          path.set({ path: d.pathData.path });
        }
        path.selectable = true; path.evented = true; canvas.requestRenderAll();
      }
    };
    const handleStrokeCancel = (e: any) => { const d = e.detail; if (!d?.strokeId) return; const path = remoteStrokesRef.current[d.strokeId]; if (path) { canvas.remove(path); delete remoteStrokesRef.current[d.strokeId]; } };
    window.addEventListener('stroke_begin', handleStrokeBegin);
    window.addEventListener('stroke_point', handleStrokePoint);
    window.addEventListener('stroke_end', handleStrokeEnd);
    window.addEventListener('stroke_cancel', handleStrokeCancel);
    return () => {
      window.removeEventListener('stroke_begin', handleStrokeBegin);
      window.removeEventListener('stroke_point', handleStrokePoint);
      window.removeEventListener('stroke_end', handleStrokeEnd);
      window.removeEventListener('stroke_cancel', handleStrokeCancel);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
  className="relative w-full h-full min-h-0 flex flex-col bg-white overflow-hidden"
      onMouseMove={handleContainerMouseMove}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Toolbar with User Info */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        {/* Left section: Active user info */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleUserSelector}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white shadow-sm border border-gray-300"
          >
            <span className="text-lg">{activeUser?.avatar}</span>
            <span className="font-medium" style={{ color: activeUser?.color }}>
              {activeUser?.name}
            </span>
            <span className="text-xs text-gray-500">
              {isUserSelectorVisible ? '▼' : '▶'}
            </span>
          </button>
          
          <div className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
            <span>Multi-User Mode</span>
            <span className="ml-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
        </div>

        {/* Right section: Tool info & Sync controls */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="px-2 py-1 bg-gray-100 rounded-md">
            Tool: {activeTool}
          </div>
          <button
            onClick={() => setAutoSyncEnabled(v => !v)}
            className={`px-3 py-1.5 rounded-md border ${autoSyncEnabled ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
            title="Toggle automatic periodic persistence"
          >
            {autoSyncEnabled ? '✅ Auto' : '▶ Auto'}
          </button>
          <button
            onClick={handleManualSync}
            className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-300"
            title="Immediately persist current canvas state"
          >
            🔄 Sync
          </button>
          {lastManualSyncTs && (
            <div className="text-[10px] text-gray-500 italic px-1">
              {Math.round((Date.now() - lastManualSyncTs)/1000)}s ago
            </div>
          )}
          <button
            onClick={handleClearCanvas}
            className="px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* User Selector Panel (conditionally rendered) */}
      {isUserSelectorVisible && (
        <div className="absolute top-12 left-2 z-50 shadow-xl">
          <UserSelector
            users={users}
            activeUserId={activeUserId}
            onUserSelect={setActiveUser}
            showAllCursors={showAllCursors}
            onToggleShowAllCursors={toggleShowAllCursors}
            liveParticipants={activeSocketUsers}
            className="w-64"
          />
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={canvasDimensions.width} 
          height={canvasDimensions.height} 
          className="w-full h-full block" 
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
        
        {/* Cursor Overlay */}
        <CursorOverlay
          users={users}
          cursorPositions={cursorPositions}
          activeUserId={activeUserId}
          showAllCursors={showAllCursors}
          containerRef={containerRef}
          onCursorMove={(position) => updateCursorPosition(position.x, position.y, containerRef.current || undefined)}
        />
      </div>

      {/* Bottom status bar */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <div>
          Room #{roomId} | Objects: {fabricCanvasRef.current?.getObjects().length || 0}
        </div>
        <div>
          Press 1-{users.length} to switch users | Tab for next user | C to toggle cursors
        </div>
      </div>
    </div>
  );
};

export default MultiUserFigmaCanvas;