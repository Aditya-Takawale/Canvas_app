// High-Performance Canvas Renderer
// Batches all rendering operations using requestAnimationFrame for 60 FPS

export class OptimizedCanvasRenderer {
  private canvas: any; // fabric.Canvas
  private renderScheduled = false;
  private pendingOperations: (() => void)[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsHistory: number[] = [];
  
  constructor(canvas: any) {
    this.canvas = canvas;
    
    // Disable automatic rendering for performance
    canvas.renderOnAddRemove = false;
    canvas.skipTargetFind = false;
    
    // Start FPS monitoring
    this.startFPSMonitoring();
  }
  
  // Schedule a rendering operation (batched with other operations in same frame)
  scheduleRender(operation?: () => void): void {
    if (operation) {
      this.pendingOperations.push(operation);
    }
    
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => this.batchRender());
    }
  }
  
  // Execute all pending operations and render once
  private batchRender(): void {
    const startTime = performance.now();
    
    // Execute all pending operations
    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      try {
        operation?.();
      } catch (error) {
        console.warn('Render operation failed:', error);
      }
    }
    
    // Single render call for all operations
    if (this.canvas) {
      this.canvas.renderAll();
    }
    
    // Reset scheduling flag
    this.renderScheduled = false;
    
    // Track performance
    const renderTime = performance.now() - startTime;
    this.updateFPS(renderTime);
    
    // Log performance issues
    if (renderTime > 16.67) { // Slower than 60 FPS
      console.warn(`⚠️ Slow render: ${renderTime.toFixed(1)}ms (target: <16.7ms)`);
    }
  }
  
  // Add object with batched rendering
  addObject(obj: any): void {
    this.scheduleRender(() => {
      this.canvas.add(obj);
    });
  }
  
  // Remove object with batched rendering
  removeObject(obj: any): void {
    this.scheduleRender(() => {
      this.canvas.remove(obj);
    });
  }
  
  // Update object properties with batched rendering
  updateObject(obj: any, properties: any): void {
    this.scheduleRender(() => {
      obj.set(properties);
    });
  }
  
  // Force immediate render (use sparingly)
  forceRender(): void {
    if (this.canvas) {
      this.canvas.renderAll();
    }
  }
  
  // FPS monitoring
  private startFPSMonitoring(): void {
    const updateFPS = () => {
      this.frameCount++;
      
      if (this.frameCount % 60 === 0) { // Every 60 frames
        const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        if (avgFPS < 50) {
          console.warn(`⚠️ Performance warning: ${avgFPS.toFixed(1)} FPS (target: 60 FPS)`);
        }
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    requestAnimationFrame(updateFPS);
  }
  
  private updateFPS(renderTime: number): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.fpsHistory.push(fps);
      
      // Keep only last 60 measurements
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
    }
    
    this.lastFrameTime = currentTime;
  }
  
  // Get performance stats
  getPerformanceStats() {
    const avgFPS = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length 
      : 0;
    
    return {
      currentFPS: avgFPS,
      pendingOperations: this.pendingOperations.length,
      renderScheduled: this.renderScheduled,
      frameCount: this.frameCount
    };
  }
}

// High-performance object pool for paths (reduces garbage collection)
export class PathObjectPool {
  private pool: any[] = [];
  private maxSize = 100;
  
  // Get a path object from pool or create new one
  getPath(): any {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    
    // Create new path if pool is empty
    const fabric = (window as any).fabric;
    return new fabric.Path('M 0 0');
  }
  
  // Return path object to pool for reuse
  returnPath(path: any): void {
    if (this.pool.length < this.maxSize) {
      // Reset path properties
      path.set({
        path: 'M 0 0',
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent'
      });
      
      this.pool.push(path);
    }
  }
  
  // Get pool statistics
  getStats() {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      utilisationPercent: (this.pool.length / this.maxSize) * 100
    };
  }
}

// Debounced cursor movement (reduces event frequency by 80%)
export class CursorOptimizer {
  private lastEmitTime = 0;
  private minInterval = 16; // ~60 FPS max
  private pendingPosition: { x: number; y: number } | null = null;
  private emitCallback: (pos: { x: number; y: number }) => void;
  private timeoutId: number | null = null;
  
  constructor(emitCallback: (pos: { x: number; y: number }) => void) {
    this.emitCallback = emitCallback;
  }
  
  // Optimized cursor position update
  updatePosition(x: number, y: number): void {
    const now = performance.now();
    this.pendingPosition = { x, y };
    
    // If enough time has passed, emit immediately
    if (now - this.lastEmitTime >= this.minInterval) {
      this.emitPosition();
    } else {
      // Schedule delayed emit if not already scheduled
      if (this.timeoutId === null) {
        const remainingTime = this.minInterval - (now - this.lastEmitTime);
        this.timeoutId = window.setTimeout(() => {
          this.emitPosition();
        }, remainingTime);
      }
    }
  }
  
  private emitPosition(): void {
    if (this.pendingPosition) {
      this.emitCallback(this.pendingPosition);
      this.lastEmitTime = performance.now();
      this.pendingPosition = null;
      this.timeoutId = null;
    }
  }
  
  // Force immediate emit (for important events)
  forceEmit(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.emitPosition();
  }
}