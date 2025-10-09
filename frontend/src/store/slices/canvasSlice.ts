import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Dispatch } from 'redux';
import { CanvasState, Canvas, DrawingOperation } from '../../interfaces/room';
import api from '../../services/api';

// Define response types
interface CanvasResponse {
  data: Canvas;
  message: string;
}

type ActiveUser = {
  userId: number;
  username: string;
  socketId: string;
  cursorPosition?: { x: number; y: number };
  color?: string;
};

const initialState: CanvasState & { activeUsers: ActiveUser[] } = {
  currentCanvas: null,
  operations: [],
  loading: false,
  error: null,
  activeUsers: [],
  activeTool: 'pencil' as 'select' | 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'star' | 'polygon' | 'text' | 'pan',
  brushSize: 5,
  brushColor: '#000000',
  // Enhancement: mark when server denies canvas history (403) to throttle polling/UI noise
  unauthorized: false
};

// Define history response type
interface CanvasHistoryResponse {
  data: {
    operations: DrawingOperation[];
    state?: any;
  };
  message: string;
}

// Async thunk actions
export const fetchCanvas = createAsyncThunk<
  CanvasResponse,
  number,
  { rejectValue: string }
>(
  'canvas/fetchCanvas',
  async (roomId: number, { rejectWithValue }) => {
    try {
      const response = await api.get<CanvasResponse>(`/api/rooms/${roomId}/canvas`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch canvas');
    }
  }
);

export const fetchCanvasHistory = createAsyncThunk<
  CanvasHistoryResponse,
  { roomId: number, limit?: number },
  { rejectValue: string }
>(
  'canvas/fetchCanvasHistory',
  async ({ roomId, limit = 100 }, { rejectWithValue }) => {
    try {
      const response = await api.get<CanvasHistoryResponse>(`/api/rooms/${roomId}/canvas/history`, {
        params: { limit }
      });
      return response.data;
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        console.warn('🚫 Unauthorized (403) fetching canvas history. Room or token access denied.', {
          roomId,
          limit,
          message: err.response?.data?.message
        });
      }
      return rejectWithValue(err.response?.data?.message || `Failed to fetch canvas history${status ? ` (status ${status})` : ''}`);
    }
  }
);

export const saveCanvasState = createAsyncThunk<
  CanvasResponse,
  { 
    roomId: number, 
    state?: any, 
    operations?: { objectType: string, objectData: any, action: string }[] 
  },
  { rejectValue: string }
>(
  'canvas/saveCanvasState',
  async ({ roomId, state, operations }, { rejectWithValue }) => {
    try {
      const response = await api.post<CanvasResponse>(`/api/rooms/${roomId}/canvas/state`, {
        state,
        operations
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to save canvas state');
    }
  }
);

export const updateCanvas = createAsyncThunk<
  CanvasResponse,
  { roomId: number, canvasData: Partial<Canvas> },
  { rejectValue: string }
>(
  'canvas/updateCanvas',
  async ({ roomId, canvasData }, { rejectWithValue }) => {
    try {
      const response = await api.put<CanvasResponse>(`/api/rooms/${roomId}/canvas`, canvasData);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update canvas');
    }
  }
);

const canvasSlice = createSlice<typeof initialState, {
  setCurrentCanvas: (state: typeof initialState, action: PayloadAction<Canvas | null>) => void;
  addOperation: (state: typeof initialState, action: PayloadAction<DrawingOperation>) => void;
  clearOperations: (state: typeof initialState) => void;
  setActiveUsers: (state: typeof initialState, action: PayloadAction<ActiveUser[]>) => void;
  updateUserCursor: (state: typeof initialState, action: PayloadAction<{ userId: number; cursorPosition: { x: number; y: number } }>) => void;
  addActiveUser: (state: typeof initialState, action: PayloadAction<ActiveUser>) => void;
  updateActiveUserColor: (state: typeof initialState, action: PayloadAction<{ userId: number; color: string }>) => void;
  removeActiveUser: (state: typeof initialState, action: PayloadAction<{ userId?: number; socketId?: string }>) => void;
  setActiveTool: (state: typeof initialState, action: PayloadAction<'select' | 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'star' | 'polygon' | 'text' | 'pan'>) => void;
  setBrushSize: (state: typeof initialState, action: PayloadAction<number>) => void;
  setBrushColor: (state: typeof initialState, action: PayloadAction<string>) => void;
}>({
  name: 'canvas',
  initialState,
  reducers: {
    setCurrentCanvas: (state, action: PayloadAction<Canvas | null>) => {
      state.currentCanvas = action.payload;
    },
    addOperation: (state, action: PayloadAction<DrawingOperation>) => {
      if (!(state as any)._opBuffer) {
        (state as any)._opBuffer = [] as DrawingOperation[];
      }
      (state as any)._opBuffer.push(action.payload);
      // Lazy schedule flush flag
      if (!(state as any)._opFlushScheduled) {
        (state as any)._opFlushScheduled = true;
        // NOTE: We cannot call setTimeout directly inside reducer; the actual flush will happen in a middleware-like pattern.
      }
    },
    clearOperations: (state) => {
      console.log('🔥 Redux clearOperations called - CLEARING ALL OPERATIONS!', new Error().stack);
      state.operations = [];
    },
    setActiveUsers: (state, action: PayloadAction<ActiveUser[]>) => {
      state.activeUsers = action.payload;
    },
    updateUserCursor: (state, action: PayloadAction<{
      userId: number;
      cursorPosition: { x: number; y: number };
    }>) => {
      const { userId, cursorPosition } = action.payload;
      const userIndex = state.activeUsers.findIndex(user => user.userId === userId);
      
      if (userIndex !== -1) {
        state.activeUsers[userIndex].cursorPosition = cursorPosition;
      }
    },
    addActiveUser: (state, action: PayloadAction<ActiveUser>) => {
      // Check for duplicates by both userId and socketId
      const existingUser = state.activeUsers.find(
        user => user.userId === action.payload.userId || user.socketId === action.payload.socketId
      );
      
      if (!existingUser) {
        state.activeUsers.push(action.payload);
      } else {
        // Update existing user info
        const index = state.activeUsers.indexOf(existingUser);
        state.activeUsers[index] = { ...existingUser, ...action.payload };
      }
    },
    updateActiveUserColor: (state, action: PayloadAction<{ userId: number; color: string }>) => {
      const user = state.activeUsers.find(u => u.userId === action.payload.userId) as ActiveUser | undefined;
      if (user) {
        user.color = action.payload.color;
      }
    },
    removeActiveUser: (state, action: PayloadAction<{ userId?: number, socketId?: string }>) => {
      if (action.payload.userId !== undefined) {
        state.activeUsers = state.activeUsers.filter(user => user.userId !== action.payload.userId);
      } else if (action.payload.socketId !== undefined) {
        state.activeUsers = state.activeUsers.filter(user => user.socketId !== action.payload.socketId);
      }
    },
    setActiveTool: (state, action: PayloadAction<'select' | 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'star' | 'polygon' | 'text' | 'pan'>) => {
      state.activeTool = action.payload;
      // Auto-set brush color to white when eraser is selected
      if (action.payload === 'eraser') {
        state.brushColor = '#ffffff';
      }
    },
    setBrushSize: (state, action: PayloadAction<number>) => {
      state.brushSize = action.payload;
    },
    setBrushColor: (state, action: PayloadAction<string>) => {
      state.brushColor = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Fetch canvas
    builder.addCase(fetchCanvas.pending, (state) => {
      state.loading = true;
      state.error = null;
      // Clear operations when loading a new canvas to ensure proper room isolation
      state.operations = [];
      state.activeUsers = [];
    });
    builder.addCase(fetchCanvas.fulfilled, (state, action) => {
      console.log('🔥 fetchCanvas.fulfilled called - loading new room canvas!', {
        roomId: action.payload.data.roomId,
        receivedData: action.payload.data
      });
      state.loading = false;
      state.currentCanvas = action.payload.data;
      // Clear active users when loading a new room
      state.activeUsers = [];
    });
    builder.addCase(fetchCanvas.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Fetch canvas history
    builder.addCase(fetchCanvasHistory.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCanvasHistory.fulfilled, (state, action) => {
      console.log('🔥 fetchCanvasHistory.fulfilled - operations from server:', {
        currentOperations: state.operations.length,
        serverOperations: action.payload.data.operations?.length || 0,
        serverData: action.payload.data
      });
      state.loading = false;
      state.operations = action.payload.data.operations || [];
      state.unauthorized = false; // cleared on success
      // Only update canvas state if it exists in the response
      if (action.payload.data.state) {
        if (state.currentCanvas) {
          state.currentCanvas.state = action.payload.data.state;
        }
      }
    });
    builder.addCase(fetchCanvasHistory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      if ((action.payload as string)?.toLowerCase().includes('403')) {
        state.unauthorized = true;
      }
    });
    
    // Save canvas state
    builder.addCase(saveCanvasState.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(saveCanvasState.fulfilled, (state, action) => {
      state.loading = false;
      state.currentCanvas = action.payload.data;
    });
    builder.addCase(saveCanvasState.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Update canvas
    builder.addCase(updateCanvas.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateCanvas.fulfilled, (state, action) => {
      state.loading = false;
      state.currentCanvas = action.payload.data;
    });
    builder.addCase(updateCanvas.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Room switching is now handled directly by the components
  },
});

// No switchRoom function - we handle this in components directly

export const { 
  setCurrentCanvas, 
  addOperation, 
  clearOperations, 
  setActiveUsers,
  updateUserCursor,
  addActiveUser,
  removeActiveUser,
  updateActiveUserColor,
  setActiveTool,
  setBrushSize,
  setBrushColor
} = canvasSlice.actions;

// Selectors
export const selectCurrentCanvas = (state: { canvas: CanvasState }) => state.canvas.currentCanvas;
export const selectCanvasOperations = (state: { canvas: CanvasState }) => state.canvas.operations;
export const selectCanvasLoading = (state: { canvas: CanvasState }) => state.canvas.loading;
export const selectCanvasError = (state: { canvas: CanvasState }) => state.canvas.error;

// --- Micro-batching for operations (outside reducer purity) ---

let __opBuffer: DrawingOperation[] = [];
let __flushHandle: any = null;
const OP_FLUSH_INTERVAL = 80; // ms

const flushOps = (dispatch: Dispatch) => {
  if (!__opBuffer.length) return;
  const ops = __opBuffer.slice();
  __opBuffer = [];
  dispatch({ type: 'canvas/__BATCH_INSERT', payload: ops });
};

export const dispatchAddOperationBatched = (op: DrawingOperation) => (dispatch: Dispatch) => {
  __opBuffer.push(op);
  if (!__flushHandle) {
    __flushHandle = setTimeout(() => {
      __flushHandle = null;
      flushOps(dispatch);
    }, OP_FLUSH_INTERVAL);
  }
};

// Wrap reducer to handle batch insert without polluting main slice definition
const baseReducer = canvasSlice.reducer;
// @ts-ignore augment
canvasSlice.reducer = (state: any, action: any) => {
  if (action.type === 'canvas/__BATCH_INSERT') {
    // Immutable append
    return { ...state, operations: [...state.operations, ...action.payload] };
  }
  return baseReducer(state, action);
};
export const selectActiveUsers = (state: { canvas: CanvasState }) => state.canvas.activeUsers;

export default canvasSlice.reducer;