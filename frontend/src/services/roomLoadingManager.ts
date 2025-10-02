/**
 * Singleton service to manage room loading and prevent multiple simultaneous requests
 * This ensures only one component can load a room at a time, preventing the infinite request loop
 */

interface LoadingPromise {
  promise: Promise<any>;
  roomId: number;
  timestamp: number;
}

class RoomLoadingManager {
  private static instance: RoomLoadingManager;
  private loadingPromises: Map<number, LoadingPromise> = new Map();
  private readonly LOADING_TIMEOUT = 10000; // 10 seconds max loading time

  private constructor() {}

  public static getInstance(): RoomLoadingManager {
    if (!RoomLoadingManager.instance) {
      RoomLoadingManager.instance = new RoomLoadingManager();
    }
    return RoomLoadingManager.instance;
  }

  /**
   * Load a room's canvas state, ensuring only one request per room at a time
   */
  public async loadRoom(
    roomId: number,
    loadFunction: () => Promise<any>,
    componentName: string = 'Unknown'
  ): Promise<any> {
    console.log(`🏠 RoomLoadingManager: ${componentName} requesting to load room ${roomId}`);

    // Check if this room is already being loaded
    const existingLoad = this.loadingPromises.get(roomId);
    if (existingLoad) {
      const age = Date.now() - existingLoad.timestamp;
      
      // If the existing load is too old, clear it and start fresh
      if (age > this.LOADING_TIMEOUT) {
        console.log(`⏰ RoomLoadingManager: Existing load for room ${roomId} timed out (${age}ms), clearing`);
        this.loadingPromises.delete(roomId);
      } else {
        console.log(`⏳ RoomLoadingManager: Room ${roomId} already loading, waiting for existing request (${componentName})`);
        return existingLoad.promise;
      }
    }

    // Create new loading promise
    console.log(`🚀 RoomLoadingManager: Starting new load for room ${roomId} (${componentName})`);
    
    const loadingPromise: LoadingPromise = {
      roomId,
      timestamp: Date.now(),
      promise: this.executeLoad(roomId, loadFunction, componentName)
    };

    this.loadingPromises.set(roomId, loadingPromise);
    return loadingPromise.promise;
  }

  private async executeLoad(
    roomId: number,
    loadFunction: () => Promise<any>,
    componentName: string
  ): Promise<any> {
    try {
      console.log(`📥 RoomLoadingManager: Executing load for room ${roomId} (${componentName})`);
      const result = await loadFunction();
      console.log(`✅ RoomLoadingManager: Successfully loaded room ${roomId} (${componentName})`);
      return result;
    } catch (error) {
      console.error(`❌ RoomLoadingManager: Failed to load room ${roomId} (${componentName}):`, error);
      throw error;
    } finally {
      // Always clean up the loading promise when done
      console.log(`🧹 RoomLoadingManager: Cleaning up load for room ${roomId} (${componentName})`);
      this.loadingPromises.delete(roomId);
    }
  }

  /**
   * Cancel all loading requests for a specific room
   */
  public cancelRoomLoading(roomId: number, reason: string = 'Unknown'): void {
    const existingLoad = this.loadingPromises.get(roomId);
    if (existingLoad) {
      console.log(`❌ RoomLoadingManager: Cancelling load for room ${roomId}, reason: ${reason}`);
      this.loadingPromises.delete(roomId);
    }
  }

  /**
   * Cancel all loading requests
   */
  public cancelAllLoading(reason: string = 'Unknown'): void {
    console.log(`❌ RoomLoadingManager: Cancelling all loading requests, reason: ${reason}`);
    this.loadingPromises.clear();
  }

  /**
   * Get information about currently loading rooms
   */
  public getLoadingInfo(): { roomId: number; age: number; componentName?: string }[] {
    const info: { roomId: number; age: number }[] = [];
    const now = Date.now();
    
    this.loadingPromises.forEach((loadingPromise, roomId) => {
      info.push({
        roomId,
        age: now - loadingPromise.timestamp
      });
    });
    
    return info;
  }

  /**
   * Check if a room is currently being loaded
   */
  public isRoomLoading(roomId: number): boolean {
    return this.loadingPromises.has(roomId);
  }
}

export default RoomLoadingManager.getInstance();