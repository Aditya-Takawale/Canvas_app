import { createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';
import { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  registerStart,
  registerSuccess,
  registerFailure
} from '../store/slices/authSlice';
import { RootState } from '../store';
import { LoginCredentials, AuthResponse, User, RegisterCredentials } from '../interfaces/auth';

// Login thunk
export const login = createAsyncThunk<
  AuthResponse,
  LoginCredentials,
  { rejectValue: string, state: RootState }
>(
  'auth/login',
  async (credentials: LoginCredentials, { dispatch, rejectWithValue }) => {
    try {
      dispatch(loginStart());
      
      const response = await api.post<AuthResponse>(
        '/api/auth/login', 
        credentials
      );
      
      const { user, token } = response.data.data;
      
      // Dispatch login success with user and token
      dispatch(loginSuccess({ user, token }));
      
      return response.data;
    } catch (error: any) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      dispatch(loginFailure(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

// Register thunk
export const register = createAsyncThunk<
  AuthResponse,
  RegisterCredentials,
  { rejectValue: string, state: RootState }
>(
  'auth/register',
  async (userData: RegisterCredentials, { dispatch, rejectWithValue }) => {
    try {
      dispatch(registerStart());
      
      const response = await api.post<AuthResponse>(
        '/api/auth/register', 
        userData
      );
      
      const { user, token } = response.data.data;
      
      // Dispatch register success with user and token
      dispatch(registerSuccess({ user, token }));
      
      return response.data;
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      dispatch(registerFailure(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

// Check authentication status
export const checkAuthStatus = createAsyncThunk<
  AuthResponse,
  void,
  { rejectValue: string, state: RootState }
>(
  'auth/checkStatus',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('No token found');
      }
      
      dispatch(loginStart());
      
      const response = await api.get<AuthResponse>(
        '/api/auth/me'
      );
      
      const { user } = response.data.data;
      
      // Dispatch login success with user and token from local storage
      dispatch(loginSuccess({ user, token }));
      
      return response.data;
    } catch (error: any) {
      let errorMessage = 'Authentication check failed.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      dispatch(loginFailure(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);