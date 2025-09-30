export interface Room {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  joinCode: string | null;
  createdAt: string;
  updatedAt: string;
  creatorId: number;
  creator?: {
    id: number;
    username: string;
    email?: string;
  };
  canvas?: Canvas;
}

export interface Canvas {
  id: number;
  name: string | null;
  width: number;
  height: number;
  state: any | null;
  createdAt: string;
  updatedAt: string;
  roomId: number;
  creatorId: number;
}

export interface DrawingOperation {
  id: number;
  objectType: string;
  objectData: any;
  action: string;
  createdAt: string;
  canvasId: number;
  userId: number;
}

export interface RoomListResponse {
  status: string;
  message: string;
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface RoomResponse {
  status: string;
  message: string;
  data: Room;
}

export interface CanvasResponse {
  status: string;
  message: string;
  data: Canvas;
}

export interface CanvasHistoryResponse {
  status: string;
  message: string;
  data: {
    operations: DrawingOperation[];
    state: any | null;
  };
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
  width?: number;
  height?: number;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

export interface JoinRoomRequest {
  joinCode?: string;
}

export interface UpdateCanvasRequest {
  name?: string;
  width?: number;
  height?: number;
}

export interface SaveCanvasStateRequest {
  state?: any;
  operations?: {
    objectType: string;
    objectData: any;
    action: string;
  }[];
}

export interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
}

export interface CanvasState {
  currentCanvas: Canvas | null;
  operations: DrawingOperation[];
  loading: boolean;
  error: string | null;
  activeUsers: {
    userId: number;
    username: string;
    socketId: string;
    cursorPosition?: { x: number; y: number };
  }[];
  activeTool: 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'select';
  brushSize: number;
  brushColor: string;
}