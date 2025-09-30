import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CanvasState, Canvas, DrawingOperation } from '../../interfaces/room';
import api from '../../services/api';

// Define response types
interface CanvasResponse {
  data: Canvas;
  message: string;
}

const initialState: CanvasState = {
  currentCanvas: null,
  operations: [],
  loading: false,
  error: null,
  activeUsers: [],
  activeTool: 'pencil' as 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'select',
  brushSize: 5,
  brushColor: '#000000'
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
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch canvas history');
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

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setCurrentCanvas: (state, action: PayloadAction<Canvas | null>) => {
      state.currentCanvas = action.payload;
    },
    addOperation: (state, action: PayloadAction<DrawingOperation>) => {
      console.log('🔴 Redux addOperation called:', { 
        currentOperations: state.operations.length, 
        newOperation: action.payload.objectType,
        action: action.payload.action 
      });
      // Use immutable update to ensure React re-renders are triggered
      state.operations = [...state.operations, action.payload];
    },
    clearOperations: (state) => {
      console.log('🔥 Redux clearOperations called - CLEARING ALL OPERATIONS!', new Error().stack);
      state.operations = [];
    },
    setActiveUsers: (state, action: PayloadAction<{
      userId: number;
      username: string;
      socketId: string;
      cursorPosition?: { x: number; y: number };
    }[]>) => {
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
    addActiveUser: (state, action: PayloadAction<{
      userId: number;
      username: string;
      socketId: string;
    }>) => {
      const existingUser = state.activeUsers.find(user => user.userId === action.payload.userId);
      
      if (!existingUser) {
        state.activeUsers.push(action.payload);
      }
    },
    removeActiveUser: (state, action: PayloadAction<{ userId?: number, socketId?: string }>) => {
      if (action.payload.userId !== undefined) {
        state.activeUsers = state.activeUsers.filter(user => user.userId !== action.payload.userId);
      } else if (action.payload.socketId !== undefined) {
        state.activeUsers = state.activeUsers.filter(user => user.socketId !== action.payload.socketId);
      }
    },
    setActiveTool: (state, action: PayloadAction<'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'select'>) => {
      state.activeTool = action.payload;
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
    });
    builder.addCase(fetchCanvas.fulfilled, (state, action) => {
      console.log('🔥 fetchCanvas.fulfilled called - this might affect operations!', {
        currentOperations: state.operations.length,
        receivedData: action.payload.data
      });
      state.loading = false;
      state.currentCanvas = action.payload.data;
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
  },
});

export const { 
  setCurrentCanvas, 
  addOperation, 
  clearOperations, 
  setActiveUsers,
  updateUserCursor,
  addActiveUser,
  removeActiveUser,
  setActiveTool,
  setBrushSize,
  setBrushColor
} = canvasSlice.actions;

// Selectors
export const selectCurrentCanvas = (state: { canvas: CanvasState }) => state.canvas.currentCanvas;
export const selectCanvasOperations = (state: { canvas: CanvasState }) => state.canvas.operations;
export const selectCanvasLoading = (state: { canvas: CanvasState }) => state.canvas.loading;
export const selectCanvasError = (state: { canvas: CanvasState }) => state.canvas.error;
export const selectActiveUsers = (state: { canvas: CanvasState }) => state.canvas.activeUsers;

export default canvasSlice.reducer;