import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import roomReducer from './slices/roomSlice';
import canvasReducer from './slices/canvasSlice';
import uiReducer from './slices/uiSlice';
import { authApi } from '../services/auth.api';

// Define a type for the auth state
export interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Define a type for the room state
export interface RoomState {
  currentRoom: any | null;
  rooms: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages: number;
  } | null;
  loading: boolean;
  error: string | null;
}

// Define a type for the canvas state
export interface CanvasState {
  currentCanvas: any | null;
  activeUsers: any[];
  loading: boolean;
  error: string | null;
}

// Define a type for the UI state
export interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  notifications: any[];
}

// Define the full RootState interface
export interface RootState {
  auth: AuthState;
  room: RoomState;
  canvas: CanvasState;
  ui: UIState;
  [key: string]: any; // For dynamically added reducers like API slices
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer,
    canvas: canvasReducer,
    ui: uiReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware),
});

// Also keep the inferred types for backward compatibility
export type AppDispatch = typeof store.dispatch;