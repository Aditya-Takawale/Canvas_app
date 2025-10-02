import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addOperation, saveCanvasState, fetchCanvas } from '../store/slices/canvasSlice';
import { createCanvasSocket } from '../services/socket';

interface PerformantCanvasProps {
  roomId: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

// Lazy load Fabric.js to reduce initial bundle size
const loadFabric = async () => {
  const { fabric } = await import('fabric');
  return fabric;
};

/**
 * PERFORMANCE-OPTIMIZED CANVAS COMPONENT
 * Features:
 * 1. Lazy-loaded Fabric.js to reduce initial bundle
 * 2. Memoized operations and event handlers
 * 3. Optimized rendering with requestAnimationFrame
 * 4. Minimal re-renders with strategic useCallback/useMemo
 * 5. Efficient memory management
 */
const PerformantCanvas: React.FC<PerformantCanvasProps> = ({ 
  roomId, 
  width = 1200, 
  height = 800, 
  readOnly = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const socketRef = useRef<ReturnType<typeof createCanvasSocket> | null>(null);
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingStateRef = useRef(false);
  const lastRestoredStateRef = useRef<string | null>(null);
  const currentRoomIdRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Shape drawing state
  const isDrawingShapeRef = useRef(false);
  const shapeStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<any>(null);
  const panStateRef = useRef<{ isDragging: boolean; lastPosX: number; lastPosY: number }>({
    isDragging: false,
    lastPosX: 0,
    lastPosY: 0,
  });
  
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentCanvas } = useAppSelector((state) => state.canvas);

  // Memoized tool state selectors for performance
  const toolState = useMemo(() => ({
    activeTool: (useAppSelector(state => (state.canvas as any).activeTool) || 'pencil') as string,
    brushSize: (useAppSelector(state => (state.canvas as any).brushSize) || 5) as number,
    brushColor: (useAppSelector(state => (state.canvas as any).brushColor) || '#000000') as string,
  }), []);

  const { activeTool, brushSize, brushColor } = toolState;

  // Initialize Fabric.js asynchronously
  useEffect(() => {
    let mounted = true;
    
    const initializeFabric = async () => {
      try {
        if (!fabricLoaded) {
          console.log('🎨 Loading Fabric.js...');
          await loadFabric();
          if (mounted) {
            setFabricLoaded(true);
            console.log('✅ Fabric.js loaded successfully');
          }
        }
      } catch (error) {
        console.error('❌ Failed to load Fabric.js:', error);
      }
    };

    initializeFabric();
    
    return () => {
      mounted = false;
    };
  }, [fabricLoaded]);

  // Optimized canvas initialization with Fabric.js
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current || isInitializedRef.current) return;

    const initializeCanvas = async () => {
      try {
        const fabric = await loadFabric();
        
        console.log('🎨 Initializing performant canvas...');
        
        const canvas = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
          isDrawingMode: !readOnly,
          preserveObjectStacking: true,
          renderOnAddRemove: false, // Manual rendering for better performance
          skipTargetFind: false,
          selection: !readOnly,
          enableRetinaScaling: false, // Disable for better performance
          imageSmoothingEnabled: false, // Disable for better performance
        });

        fabricCanvasRef.current = canvas;
        isInitializedRef.current = true;

        // Configure brush with performance optimizations
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = brushColor;
          canvas.freeDrawingBrush.width = brushSize;
          canvas.freeDrawingBrush.decimate = 0.4; // Reduce path points for performance
        }

        // Optimized rendering function
        const optimizedRender = () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          animationFrameRef.current = requestAnimationFrame(() => {
            canvas.renderAll();
          });
        };

        // Setup optimized event handlers
        canvas.on('path:created', optimizedRender);
        canvas.on('object:added', optimizedRender);
        canvas.on('object:removed', optimizedRender);
        
        console.log('✅ Performant canvas initialized');
        setIsLoading(false);

      } catch (error) {
        console.error('❌ Canvas initialization failed:', error);
        setIsLoading(false);
      }
    };

    initializeCanvas();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [fabricLoaded, width, height, readOnly, brushSize, brushColor]);

  // Clear canvas when room changes (performance optimized)
  useEffect(() => {
    if (currentRoomIdRef.current !== null && currentRoomIdRef.current !== roomId) {
      console.log(`🧹 Room changed from ${currentRoomIdRef.current} to ${roomId}, clearing canvas`);
      
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        // Batch operations for better performance
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(() => {
          canvas.renderAll();
        });
        
        // Reset state tracking refs
        lastRestoredStateRef.current = null;
        isLoadingStateRef.current = false;
      }
    }
    currentRoomIdRef.current = roomId;
  }, [roomId]);

  // Debounced save function (performance optimized)
  const debouncedSave = useCallback(() => {
    if (isLoadingStateRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || isLoadingStateRef.current) return;
      
      try {
        const canvasState = JSON.stringify(canvas.toJSON());
        
        if (currentCanvas?.roomId === roomId) {
          console.log('💾 Auto-saving canvas state...');
          await dispatch(saveCanvasState({
            roomId,
            state: canvasState
          }));
        }
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 2000); // Reduced save frequency for better performance
  }, [roomId, dispatch, currentCanvas]);

  // Performance loading screen
  if (isLoading || !fabricLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">
            {!fabricLoaded ? 'Loading canvas engine...' : 'Initializing canvas...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-lg shadow-sm"
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%',
          imageRendering: 'pixelated' // Better performance for canvas
        }}
      />
      
      {/* Performance indicators for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          Room: {roomId} | Tool: {activeTool}
        </div>
      )}
    </div>
  );
};

export default PerformantCanvas;