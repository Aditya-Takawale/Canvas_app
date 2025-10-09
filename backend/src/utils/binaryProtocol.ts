// Binary Protocol Handler for Backend
// Processes binary stroke and cursor data for maximum performance

export interface BinaryStrokeData {
  strokeId: string;
  points: Array<{ x: number; y: number; dt?: number }>;
  color: string;
  size: number;
  tool: string;
}

export class BackendBinaryDecoder {
  // Decode stroke data from binary format
  static decodeStroke(buffer: ArrayBuffer): BinaryStrokeData {
    const view = new DataView(buffer);
    let offset = 0;
    
    // Read header
    const strokeIdLength = view.getUint32(offset, true); offset += 4;
    const colorLength = view.getUint32(offset, true); offset += 4;
    const toolLength = view.getUint32(offset, true); offset += 4;
    const pointsCount = view.getUint32(offset, true); offset += 4;
    
    // Read strings
    const strokeId = new TextDecoder().decode(new Uint8Array(buffer, offset, strokeIdLength));
    offset += strokeIdLength;
    
    const color = new TextDecoder().decode(new Uint8Array(buffer, offset, colorLength));
    offset += colorLength;
    
    const tool = new TextDecoder().decode(new Uint8Array(buffer, offset, toolLength));
    offset += toolLength;
    
    // Read size
    const size = view.getFloat32(offset, true); offset += 4;
    
    // Read points
    const points: Array<{ x: number; y: number; dt?: number }> = [];
    for (let i = 0; i < pointsCount; i++) {
      const x = view.getFloat32(offset, true); offset += 4;
      const y = view.getFloat32(offset, true); offset += 4;
      const dt = view.getFloat32(offset, true); offset += 4;
      points.push({ x, y, dt: dt || undefined });
    }
    
    return { strokeId, points, color, size, tool };
  }
  
  // Decode cursor data from binary format
  static decodeCursor(buffer: ArrayBuffer): { userId: number; x: number; y: number } {
    const view = new DataView(buffer);
    
    return {
      userId: view.getUint32(0, true),
      x: view.getFloat32(4, true),
      y: view.getFloat32(8, true)
    };
  }
  
  // Convert binary stroke to legacy format for compatibility
  static toLegacyStroke(binaryStroke: BinaryStrokeData, roomId: string, userId: number, email: string) {
    return {
      strokeId: binaryStroke.strokeId,
      color: binaryStroke.color,
      size: binaryStroke.size,
      tool: binaryStroke.tool,
      points: binaryStroke.points,
      roomId,
      userId,
      email,
      ts: Date.now()
    };
  }
}

// Performance monitoring for backend
export class BackendBinaryStats {
  private static processedCount = 0;
  private static totalSavings = 0;
  
  static recordProcessed(originalSize: number, binarySize: number) {
    this.processedCount++;
    this.totalSavings += (originalSize - binarySize);
    
    if (this.processedCount % 100 === 0) {
      const avgSavings = this.totalSavings / this.processedCount;
      console.log(`📊 Backend Binary Processing: ${this.processedCount} packets, ${avgSavings.toFixed(1)} avg bytes saved per packet`);
    }
  }
}