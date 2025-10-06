import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { 
  RoomListResponse, 
  RoomResponse, 
  CanvasResponse, 
  CanvasHistoryResponse,
  CreateRoomRequest,
  UpdateRoomRequest,
  JoinRoomRequest,
  UpdateCanvasRequest,
  SaveCanvasStateRequest
} from '../interfaces/room';
import { RootState } from '../store';
import { apiBaseUrl } from '../config/environment';

export const roomsApi = createApi({
  reducerPath: 'roomsApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: `${apiBaseUrl}/api`,
    prepareHeaders: (headers, { getState }) => {
      // Get token from auth state
      const state = getState() as RootState;
      const token = state.auth.token;
      
      // If token exists, add authorization header
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      return headers;
    },
  }),
  tagTypes: ['Room', 'Canvas'],
  endpoints: (builder) => ({
    // Room endpoints
    getRooms: builder.query<RoomListResponse, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: '/rooms',
        params: params,
      }),
      providesTags: (result) => 
        result 
          ? [
              ...result.data.map(({ id }) => ({ type: 'Room' as const, id })),
              { type: 'Room', id: 'LIST' },
            ]
          : [{ type: 'Room', id: 'LIST' }],
    }),
    
    getRoomById: builder.query<RoomResponse, number>({
      query: (roomId) => `/rooms/${roomId}`,
      providesTags: (result, error, id) => [{ type: 'Room', id }],
    }),
    
    createRoom: builder.mutation<RoomResponse, CreateRoomRequest>({
      query: (roomData) => ({
        url: '/rooms',
        method: 'POST',
        body: roomData,
      }),
      invalidatesTags: [{ type: 'Room', id: 'LIST' }],
    }),
    
    updateRoom: builder.mutation<RoomResponse, { roomId: number; data: UpdateRoomRequest }>({
      query: ({ roomId, data }) => ({
        url: `/rooms/${roomId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: 'Room', id: roomId },
        { type: 'Room', id: 'LIST' },
      ],
    }),
    
    deleteRoom: builder.mutation<{ success: boolean }, number>({
      query: (roomId) => ({
        url: `/rooms/${roomId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Room', id: 'LIST' }],
    }),
    
    joinRoom: builder.mutation<RoomResponse, { roomId: number; data?: JoinRoomRequest }>({
      query: ({ roomId, data }) => ({
        url: `/rooms/${roomId}/join`,
        method: 'POST',
        body: data || {},
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: 'Room', id: roomId }],
    }),
    
    leaveRoom: builder.mutation<{ success: boolean }, number>({
      query: (roomId) => ({
        url: `/rooms/${roomId}/leave`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, roomId) => [{ type: 'Room', id: roomId }],
    }),
    
    // Canvas endpoints
    getCanvas: builder.query<CanvasResponse, number>({
      query: (roomId) => `/rooms/${roomId}/canvas`,
      providesTags: (result, error, roomId) => [{ type: 'Canvas', id: roomId }],
    }),
    
    updateCanvas: builder.mutation<CanvasResponse, { roomId: number; data: UpdateCanvasRequest }>({
      query: ({ roomId, data }) => ({
        url: `/rooms/${roomId}/canvas`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: 'Canvas', id: roomId }],
    }),
    
    getCanvasHistory: builder.query<CanvasHistoryResponse, { roomId: number; limit?: number }>({
      query: ({ roomId, limit }) => ({
        url: `/rooms/${roomId}/canvas/history`,
        params: { limit },
      }),
      providesTags: (result, error, { roomId }) => [{ type: 'Canvas', id: `${roomId}-history` }],
    }),
    
    saveCanvasState: builder.mutation<CanvasResponse, { roomId: number; data: SaveCanvasStateRequest }>({
      query: ({ roomId, data }) => ({
        url: `/rooms/${roomId}/canvas/state`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: 'Canvas', id: roomId },
        { type: 'Canvas', id: `${roomId}-history` },
      ],
    }),
  }),
});

export const {
  useGetRoomsQuery,
  useGetRoomByIdQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useJoinRoomMutation,
  useLeaveRoomMutation,
  useGetCanvasQuery,
  useUpdateCanvasMutation,
  useGetCanvasHistoryQuery,
  useSaveCanvasStateMutation,
} = roomsApi;