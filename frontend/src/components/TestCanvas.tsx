import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

/**
 * MINIMAL TEST CANVAS - Based on typical Figma-clone patterns
 * This component tests canvas persistence without any external dependencies
 * to isolate the drawing disappearance issue.
 */
const TestCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const objectCountRef = useRef<number>(0);

  useEffect(() => {
    console.log('🧪 TestCanvas: Initializing...');
    
    if (canvasRef.current && !fabricCanvasRef.current) {
      // Create canvas instance
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        isDrawingMode: true,
        preserveObjectStacking: true, // Important for object persistence
      });

      const canvas = fabricCanvasRef.current;
      
      // Configure brush
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = 3;
      }

      // Monitor all canvas modification methods
      const originalClear = canvas.clear;
      canvas.clear = function(...args) {
        console.error('🚨 TestCanvas: CLEAR called!', new Error().stack);
        return originalClear.apply(this, args);
      };

      const originalRemove = canvas.remove;
      canvas.remove = function(...args) {
        console.error('🚨 TestCanvas: REMOVE called!', new Error().stack);
        return originalRemove.apply(this, args);
      };

      const originalLoadFromJSON = canvas.loadFromJSON;
      canvas.loadFromJSON = function(json, callback, reviver) {
        console.error('🚨 TestCanvas: LOADFROMJSON called!', new Error().stack);
        return originalLoadFromJSON.call(this, json, callback, reviver);
      };

      // Track object creation (similar to Figma clones)
      canvas.on('path:created', (e: any) => {
        const newCount = canvas.getObjects().length;
        objectCountRef.current = newCount;
        console.log(`✏️ TestCanvas: Path created! Objects: ${newCount}`);
        
        // Monitor for disappearance with multiple timeouts
        [500, 1000, 2000, 5000].forEach(delay => {
          setTimeout(() => {
            const currentCount = canvas.getObjects().length;
            if (currentCount !== newCount) {
              console.error(`❌ TestCanvas: Object count changed after ${delay}ms! Was ${newCount}, now ${currentCount}`);
            } else {
              console.log(`✅ TestCanvas: Objects still present after ${delay}ms: ${currentCount}`);
            }
          }, delay);
        });
      });

      canvas.on('object:added', (e: any) => {
        const count = canvas.getObjects().length;
        console.log(`➕ TestCanvas: Object added! Total: ${count}`);
      });

      canvas.on('object:removed', (e: any) => {
        const count = canvas.getObjects().length;
        console.error(`🗑️ TestCanvas: Object removed! Total: ${count}`);
      });

      // Monitor canvas state changes
      canvas.on('after:render', () => {
        const count = canvas.getObjects().length;
        if (count !== objectCountRef.current) {
          console.error(`🔄 TestCanvas: Object count mismatch after render! Expected ${objectCountRef.current}, got ${count}`);
          objectCountRef.current = count;
        }
      });

      console.log('✅ TestCanvas: Canvas initialized successfully');
    }

    // NO cleanup function - let canvas persist
    // This is important - cleanup can cause object loss
  }, []); // Empty dependency array - only run once

  // Test functions
  const handleAddRectangle = () => {
    if (!fabricCanvasRef.current) return;
    
    const rect = new fabric.Rect({
      left: Math.random() * 200 + 50,
      top: Math.random() * 200 + 50,
      width: 100,
      height: 60,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    
    fabricCanvasRef.current.add(rect);
    console.log(`📦 TestCanvas: Rectangle added! Objects: ${fabricCanvasRef.current.getObjects().length}`);
  };

  const handleGetCount = () => {
    if (!fabricCanvasRef.current) return;
    const count = fabricCanvasRef.current.getObjects().length;
    console.log(`📊 TestCanvas: Current object count: ${count}`);
    console.log('📋 Objects:', fabricCanvasRef.current.getObjects().map(obj => obj.type));
  };

  const handleClearTest = () => {
    if (!fabricCanvasRef.current) return;
    console.log('🧹 TestCanvas: Manual clear test');
    fabricCanvasRef.current.clear();
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', margin: '0 0 10px 0' }}>🧪 Canvas Persistence Test</h2>
        <p style={{ color: '#666', margin: '0 0 15px 0' }}>
          This is a minimal test to isolate the drawing disappearance issue.
          Based on patterns from successful Figma clones.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleAddRectangle}
            style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ➕ Add Rectangle
          </button>
          
          <button 
            onClick={handleGetCount}
            style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 Count Objects
          </button>
          
          <button 
            onClick={handleClearTest}
            style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🧹 Clear Test
          </button>
        </div>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ border: '2px solid #ddd', borderRadius: '4px', display: 'inline-block' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default TestCanvas;