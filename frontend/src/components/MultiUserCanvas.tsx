import React, { useRef, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useMultiUserSimulation } from '../hooks/useMultiUserSimulation';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import CursorOverlay from './CursorOverlay';
import UserSelector from './UserSelector';
import { UserAction } from '../types/multiUser';

interface MultiUserCanvasProps {
  width?: number;
  height?: number;
  backgroundColor?: string;
  onCanvasChange?: (canvas: fabric.Canvas) => void;
  onUserAction?: (action: UserAction) => void;
  className?: string;
}

const MultiUserCanvas: React.FC<MultiUserCanvasProps> = ({
  width = 800,
  height = 600,
  backgroundColor = '#ffffff',
  onCanvasChange,
  onUserAction,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // Track per-object revision (monotonic increasing) to prevent stale overwrites
  const objectRevisionsRef = useRef<Map<string, number>>(new Map());

  // Helper: get next revision for an object id
  const bumpRevision = (cid: string): number => {
    const map = objectRevisionsRef.current;
    const next = (map.get(cid) || 0) + 1;
    map.set(cid, next);
    return next;
  };

  // Helper: apply guarded geometry update (only if incoming revision >= current)
  const guardedApplyPosition = (obj: fabric.Object, left?: number | null, top?: number | null, angle?: number | null, incomingRevision?: number) => {
    const cid = (obj as any)._cid;
    if (!cid) return;
    const current = objectRevisionsRef.current.get(cid) || 0;
    if (incomingRevision !== undefined && incomingRevision < current) {
      console.log('⛔ Ignoring stale geometry update', { cid, incomingRevision, current });
      return;
    }
    if (left != null) obj.set('left', left);
    if (top != null) obj.set('top', top);
    if (angle != null) (obj as any).angle = angle;
    if (incomingRevision !== undefined) {
      objectRevisionsRef.current.set(cid, incomingRevision);
    }
    (obj as any).__lastPos = { left: obj.left, top: obj.top, angle: (obj as any).angle || 0 };
  };

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
    cleanup
  } = useMultiUserSimulation();

  useKeyboardShortcuts({
    onSwitchToUser: switchToUserByNumber,
    onNextUser: switchToNextUser,
    onPreviousUser: switchToPreviousUser,
    onToggleCursors: toggleShowAllCursors,
    isEnabled: true,
    maxUsers: users.length
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true
    });

    if (!(fabric as any)._customSerializationPatched) {
      const originalToObject = fabric.Object.prototype.toObject;
      fabric.Object.prototype.toObject = function(this: fabric.Object, additionalProperties?: string[]) {
        return originalToObject.call(this, ['_cid','createdBy','createdByName','createdByColor', ...(additionalProperties || [])]);
      };
      (fabric as any)._customSerializationPatched = true;
      console.log('🧩 Fabric serialization patched with custom properties');
    }

    setFabricCanvas(canvas);
    onCanvasChange?.(canvas);
    return () => { canvas.dispose(); cleanup(); };
  }, [width, height, backgroundColor, onCanvasChange, cleanup]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const activeUser = getActiveUser();
    if (!activeUser) return;

    const ensureId = (obj: fabric.Object) => {
      if (!(obj as any)._cid) {
        (obj as any)._cid = `obj-${Date.now()}-${Math.floor(Math.random()*100000)}`;
      }
    };

    const handleObjectAdded = (e: fabric.IEvent) => {
      const obj = e.target; if (!obj) return;
      ensureId(obj);
      (obj as any).__lastPos = { left: obj.left, top: obj.top, angle: (obj as any).angle || 0 };
      bumpRevision((obj as any)._cid); // initial revision = 1
      const action = addUserAction('create', {
        objectType: obj.type,
        objectId: (obj as any)._cid,
        properties: obj.toObject()
      }, { x: obj.left || 0, y: obj.top || 0 });
      (obj as any).createdBy = activeUser.id;
      (obj as any).createdByName = activeUser.name;
      (obj as any).createdByColor = activeUser.color;
      obj.set({ stroke: activeUser.color, fill: obj.type === 'path' ? 'transparent' : activeUser.color + '40' });
      if (action) onUserAction?.(action);
    };

    const handleObjectModified = (e: fabric.IEvent) => {
      const obj = e.target; if (!obj) return;
      ensureId(obj);
      const prev = (obj as any).__lastPos;
      const now = { left: obj.left, top: obj.top, angle: (obj as any).angle || 0 };
      console.log('🧲 Object modified', { cid: (obj as any)._cid, prev, now });
      (obj as any).__lastPos = now;
      const revision = bumpRevision((obj as any)._cid);
      const action = addUserAction('move', {
        objectId: (obj as any)._cid,
        newProperties: { ...obj.toObject(), revision }
      }, { x: obj.left || 0, y: obj.top || 0 });
      if (action) onUserAction?.(action);
    };

    const handleSelectionCreated = (e: fabric.IEvent) => {
      const obj = e.target; if (!obj) return;
      ensureId(obj);
      const action = addUserAction('select', { objectId: (obj as any)._cid, objectType: obj.type });
      if ('stroke' in obj) { obj.set('stroke', activeUser.color); obj.set('strokeWidth', 3); }
      (obj as any).__lastPos = { left: obj.left, top: obj.top, angle: (obj as any).angle || 0 };
      // selection does not bump revision (no geometry change) but we assert last position
      fabricCanvas.renderAll();
      if (action) onUserAction?.(action);
    };

    const handlePathCreated = (e: any) => {
      const path = e.path; if (!path) return;
      ensureId(path);
      const action = addUserAction('draw', { pathData: path.path, stroke: activeUser.color, strokeWidth: 2 });
      (path as any).createdBy = activeUser.id;
      (path as any).createdByName = activeUser.name;
      (path as any).createdByColor = activeUser.color;
      path.set({ stroke: activeUser.color, strokeWidth: 2, fill: 'transparent' });
      if (action) onUserAction?.(action);
    };

    const handleObjectRemoved = (e: fabric.IEvent) => {
      const obj = e.target; if (!obj) return;
      const action = addUserAction('delete', { objectId: (obj as any)._cid || 'unknown', objectType: obj.type });
      if (action) onUserAction?.(action);
    };

    fabricCanvas.on('object:added', handleObjectAdded);
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('selection:created', handleSelectionCreated);
    fabricCanvas.on('path:created', handlePathCreated);
    fabricCanvas.on('object:removed', handleObjectRemoved);
    return () => {
      fabricCanvas.off('object:added', handleObjectAdded);
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('selection:created', handleSelectionCreated);
      fabricCanvas.off('path:created', handlePathCreated);
      fabricCanvas.off('object:removed', handleObjectRemoved);
    };
  }, [fabricCanvas, getActiveUser, addUserAction, onUserAction]);

  const handleCursorMove = (position: any) => { updateCursorPosition(position.x, position.y); };

  const enableDrawingMode = () => { if (fabricCanvas) { fabricCanvas.isDrawingMode = true; const activeUser = getActiveUser(); if (activeUser) { fabricCanvas.freeDrawingBrush.color = activeUser.color; fabricCanvas.freeDrawingBrush.width = 2; } setIsDrawing(true); } };
  const disableDrawingMode = () => { if (fabricCanvas) { fabricCanvas.isDrawingMode = false; setIsDrawing(false); } };

  const addRectangle = () => { if (fabricCanvas) { const activeUser = getActiveUser(); if (activeUser) { const rect = new fabric.Rect({ left: 100, top: 100, width: 100, height: 100, fill: activeUser.color + '40', stroke: activeUser.color, strokeWidth: 2 }); (rect as any)._cid = `obj-${Date.now()}-${Math.floor(Math.random()*100000)}`; fabricCanvas.add(rect); } } };
  const addCircle = () => {
    if (fabricCanvas) {
      const activeUser = getActiveUser();
      if (activeUser) {
        const circle = new fabric.Circle({
          left: 150,
          top: 150,
          radius: 50,
          fill: activeUser.color + '40',
          stroke: activeUser.color,
          strokeWidth: 2
        });
        (circle as any)._cid = `obj-${Date.now()}-${Math.floor(Math.random()*100000)}`;
        fabricCanvas.add(circle);
      }
    }
  };

  const clearCanvas = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      addUserAction('delete', { action: 'clear', timestamp: new Date() });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-4 left-4 z-50">
        <UserSelector users={users} activeUserId={activeUserId} onUserSelect={setActiveUser} showAllCursors={showAllCursors} onToggleShowAllCursors={toggleShowAllCursors} />
      </div>
      <div className="absolute top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 flex space-x-2">
        <button onClick={enableDrawingMode} className={`px-3 py-2 rounded text-sm font-medium ${isDrawing ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>✏️ Draw</button>
        <button onClick={disableDrawingMode} className="px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">👆 Select</button>
        <button onClick={addRectangle} className="px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">⬜ Rect</button>
        <button onClick={addCircle} className="px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">⭕ Circle</button>
        <button onClick={clearCanvas} className="px-3 py-2 rounded text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200">🗑️ Clear</button>
      </div>
      <div ref={containerRef} className="relative border-2 border-gray-300 rounded-lg overflow-hidden" style={{ width, height }}>
        <canvas ref={canvasRef} />
        <CursorOverlay users={users} cursorPositions={cursorPositions} activeUserId={activeUserId} showAllCursors={showAllCursors} containerRef={containerRef} onCursorMove={handleCursorMove} />
      </div>
      <div className="mt-4 bg-gray-100 rounded-lg p-3 text-sm">
        <div className="flex justify-between items-center">
          <div><span className="font-medium">Active User:</span>{' '}<span style={{ color: getActiveUser()?.color }}>{getActiveUser()?.avatar} {getActiveUser()?.name}</span></div>
          <div className="text-gray-600">Press 1-{users.length} to switch users | C to toggle cursors | Tab for next user</div>
        </div>
      </div>
    </div>
  );
};

export default MultiUserCanvas;