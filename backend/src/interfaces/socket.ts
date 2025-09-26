export interface DrawingEventData {
  roomId: string;
  objectType: string;
  objectData: any;
  action: string;
  userId?: number;
  timestamp?: Date;
}

export interface CursorMoveData {
  roomId: string;
  x: number;
  y: number;
  userId?: number;
  socketId?: string;
}

export interface RoomJoinData {
  userId: number;
  socketId: string;
  username?: string;
  timestamp: Date;
}

export interface UserCountData {
  count: number;
  roomId: string;
}