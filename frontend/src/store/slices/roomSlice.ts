import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RoomState, Room, CreateRoomRequest, JoinRoomRequest } from '../../interfaces/room';
import api from '../../services/api';

const initialState: RoomState = {
  rooms: [],
  currentRoom: null,
  pagination: {
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
};

// Define response types
interface RoomResponse {
  data: Room;
  message: string;
}

interface RoomsResponse {
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  message: string;
}

// Async thunk actions
export const fetchRooms = createAsyncThunk<
  RoomsResponse,
  { page?: number; limit?: number; search?: string },
  { rejectValue: string }
>(
  'rooms/fetchRooms',
  async ({ page = 1, limit = 10, search = '' }, { rejectWithValue }) => {
    try {
      const response = await api.get<RoomsResponse>('/api/rooms', {
        params: { page, limit, search },
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch rooms');
    }
  }
);

export const fetchRoomById = createAsyncThunk<
  RoomResponse,
  number,
  { rejectValue: string }
>(
  'rooms/fetchRoomById',
  async (roomId: number, { rejectWithValue }) => {
    try {
      const response = await api.get<RoomResponse>(`/api/rooms/${roomId}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch room');
    }
  }
);

export const updateRoom = createAsyncThunk<
  RoomResponse,
  { roomId: number, roomData: Partial<Room> },
  { rejectValue: string }
>(
  'rooms/updateRoom',
  async ({ roomId, roomData }, { rejectWithValue }) => {
    try {
      const response = await api.put<RoomResponse>(`/api/rooms/${roomId}`, roomData);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update room');
    }
  }
);

export const createRoom = createAsyncThunk<
  RoomResponse,
  CreateRoomRequest,
  { rejectValue: string }
>(
  'rooms/createRoom',
  async (roomData, { rejectWithValue }) => {
    try {
      const response = await api.post<RoomResponse>('/api/rooms', roomData);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create room');
    }
  }
);

export const joinRoom = createAsyncThunk<
  RoomResponse,
  { roomId: number; joinData?: JoinRoomRequest },
  { rejectValue: string }
>(
  'rooms/joinRoom',
  async ({ roomId, joinData }, { rejectWithValue }) => {
    try {
      const response = await api.post<RoomResponse>(`/api/rooms/${roomId}/join`, joinData || {});
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to join room');
    }
  }
);

export const deleteRoom = createAsyncThunk<
  { success: boolean; roomId: number },
  number,
  { rejectValue: string }
>(
  'rooms/deleteRoom',
  async (roomId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/rooms/${roomId}`);
      return { success: true, roomId };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete room');
    }
  }
);

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setCurrentRoom: (state, action: PayloadAction<Room | null>) => {
      state.currentRoom = action.payload;
    },
    clearRooms: (state) => {
      state.rooms = [];
      state.currentRoom = null;
      state.pagination = {
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch rooms
    builder.addCase(fetchRooms.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRooms.fulfilled, (state, action) => {
      state.loading = false;
      state.rooms = action.payload.data;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchRooms.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Fetch room by id
    builder.addCase(fetchRoomById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRoomById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentRoom = action.payload.data;
    });
    builder.addCase(fetchRoomById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update room
    builder.addCase(updateRoom.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateRoom.fulfilled, (state, action) => {
      state.loading = false;
      // Update the room in the rooms array
      if (state.rooms.length > 0) {
        const updatedRoomIndex = state.rooms.findIndex(room => room.id === (action.payload.data as Room).id);
        if (updatedRoomIndex !== -1) {
          state.rooms[updatedRoomIndex] = action.payload.data as Room;
        }
      }
      // Update current room if it's the one that was updated
      if (state.currentRoom && state.currentRoom.id === (action.payload.data as Room).id) {
        state.currentRoom = action.payload.data as Room;
      }
    });
    builder.addCase(updateRoom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create room
    builder.addCase(createRoom.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createRoom.fulfilled, (state, action) => {
      state.loading = false;
      // Add the new room to the rooms array
      state.rooms.push(action.payload.data as Room);
      // Update pagination
      state.pagination.totalCount += 1;
      state.pagination.totalPages = Math.ceil(state.pagination.totalCount / state.pagination.limit);
    });
    builder.addCase(createRoom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Join room
    builder.addCase(joinRoom.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(joinRoom.fulfilled, (state, action) => {
      state.loading = false;
      state.currentRoom = action.payload.data as Room;
    });
    builder.addCase(joinRoom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Delete room
    builder.addCase(deleteRoom.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteRoom.fulfilled, (state, action) => {
      state.loading = false;
      // Remove the deleted room from the rooms array
      state.rooms = state.rooms.filter(room => room.id !== action.payload.roomId);
      // Update pagination
      state.pagination.totalCount -= 1;
      state.pagination.totalPages = Math.ceil(state.pagination.totalCount / state.pagination.limit);
    });
    builder.addCase(deleteRoom.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setCurrentRoom, clearRooms } = roomSlice.actions;

// Selectors
export const selectRooms = (state: { room: RoomState }) => state.room.rooms;
export const selectCurrentRoom = (state: { room: RoomState }) => state.room.currentRoom;
export const selectRoomPagination = (state: { room: RoomState }) => state.room.pagination;
export const selectRoomLoading = (state: { room: RoomState }) => state.room.loading;
export const selectRoomError = (state: { room: RoomState }) => state.room.error;

export default roomSlice.reducer;