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
    cleanup
  } = useMultiUserSimulation();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSwitchToUser: switchToUserByNumber,
    onNextUser: switchToNextUser,
    onPreviousUser: switchToPreviousUser,
    onToggleCursors: toggleShowAllCursors,
    isEnabled: true,
    maxUsers: users.length
  });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true
    });

    setFabricCanvas(canvas);
    onCanvasChange?.(canvas);

    return () => {
      canvas.dispose();
      cleanup();
    };
  }, [width, height, backgroundColor, onCanvasChange, cleanup]);

  // Add event listeners for user actions
  useEffect(() => {
    if (!fabricCanvas) return;

    const activeUser = getActiveUser();
    if (!activeUser) return;

    // Track object creation
    const handleObjectAdded = (e: fabric.IEvent) => {
      const obj = e.target;
      if (obj) {
        const action = addUserAction('create', {
          objectType: obj.type,
          objectId: obj.toObject().id || Date.now(),
          properties: obj.toObject()
        }, {
          x: obj.left || 0,
          y: obj.top || 0
        });

        // Add user attribution to object
        (obj as any).createdBy = activeUser.id;
        (obj as any).createdByName = activeUser.name;
        (obj as any).createdByColor = activeUser.color;
        obj.set({
          stroke: activeUser.color,
          fill: obj.type === 'path' ? 'transparent' : activeUser.color + '40'
        });

        if (action) onUserAction?.(action);
      }
    };

    // Track object modification
    const handleObjectModified = (e: fabric.IEvent) => {
      const obj = e.target;
      if (obj) {
        const action = addUserAction('move', {
          objectId: obj.toObject().id,
          newProperties: obj.toObject()
        }, {
          x: obj.left || 0,
          y: obj.top || 0
        });

        if (action) onUserAction?.(action);
      }
    };

    // Track object selection
    const handleSelectionCreated = (e: fabric.IEvent) => {
      const obj = e.target;
      if (obj) {
        const action = addUserAction('select', {
          objectId: obj.toObject().id,
          objectType: obj.type
        });

        // Highlight selected object with user color
        if ('stroke' in obj) {
          obj.set('stroke', activeUser.color);
          obj.set('strokeWidth', 3);
        }

        fabricCanvas.renderAll();
        if (action) onUserAction?.(action);
      }
    };

    // Track drawing start
    const handlePathCreated = (e: any) => {
      const path = e.path;
      if (path) {
        const action = addUserAction('draw', {
          pathData: path.path,
          stroke: activeUser.color,
          strokeWidth: 2
        });

        // Set path properties with user attribution
        (path as any).createdBy = activeUser.id;
        (path as any).createdByName = activeUser.name;
        (path as any).createdByColor = activeUser.color;
        path.set({
          stroke: activeUser.color,
          strokeWidth: 2,
          fill: 'transparent'
        });

        if (action) onUserAction?.(action);
      }
    };

    // Track object deletion
    const handleObjectRemoved = (e: fabric.IEvent) => {
      const obj = e.target;
      if (obj) {
        const action = addUserAction('delete', {
          objectId: obj.toObject().id,
          objectType: obj.type
        });

        if (action) onUserAction?.(action);
      }
    };

    // Add event listeners
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

  // Handle cursor movement
  const handleCursorMove = (position: any) => {
    updateCursorPosition(position.x, position.y);
  };

  // Drawing tools for demonstration
  const enableDrawingMode = () => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = true;
      const activeUser = getActiveUser();
      if (activeUser) {
        fabricCanvas.freeDrawingBrush.color = activeUser.color;
        fabricCanvas.freeDrawingBrush.width = 2;
      }
      setIsDrawing(true);
    }
  };

  const disableDrawingMode = () => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = false;
      setIsDrawing(false);
    }
  };

  const addRectangle = () => {
    if (fabricCanvas) {
      const activeUser = getActiveUser();
      if (activeUser) {
        const rect = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: activeUser.color + '40',
          stroke: activeUser.color,
          strokeWidth: 2
        });

        fabricCanvas.add(rect);
      }
    }
  };

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
      {/* User Selector */}
      <div className="absolute top-4 left-4 z-50">
        <UserSelector
          users={users}
          activeUserId={activeUserId}
          onUserSelect={setActiveUser}
          showAllCursors={showAllCursors}
          onToggleShowAllCursors={toggleShowAllCursors}
        />
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 flex space-x-2">
        <button
          onClick={enableDrawingMode}
          className={`px-3 py-2 rounded text-sm font-medium ${
            isDrawing 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✏️ Draw
        </button>
        <button
          onClick={disableDrawingMode}
          className="px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          👆 Select
        </button>
        <button
          onClick={addRectangle}
          className="px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          ⬜ Rect
        </button>
        <button
          onClick={addCircle}
          className="px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          ⭕ Circle
        </button>
        <button
          onClick={clearCanvas}
          className="px-3 py-2 rounded text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="relative border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{ width, height }}
      >
        <canvas ref={canvasRef} />
        
        {/* Cursor Overlay */}
        <CursorOverlay
          users={users}
          cursorPositions={cursorPositions}
          activeUserId={activeUserId}
          showAllCursors={showAllCursors}
          containerRef={containerRef}
          onCursorMove={handleCursorMove}
        />
      </div>

      {/* Status Bar */}
      <div className="mt-4 bg-gray-100 rounded-lg p-3 text-sm">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-medium">Active User:</span>{' '}
            <span style={{ color: getActiveUser()?.color }}>
              {getActiveUser()?.avatar} {getActiveUser()?.name}
            </span>
          </div>
          <div className="text-gray-600">
            Press 1-{users.length} to switch users | C to toggle cursors | Tab for next user
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiUserCanvas;