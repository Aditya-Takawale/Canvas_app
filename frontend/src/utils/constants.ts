// Socket event names - keep in sync with backend
export enum SocketEvents {
  // Connection events
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_COUNT = 'user_count',
  
  // Drawing events
  DRAWING_EVENT = 'drawing_event',
  CANVAS_CLEARED = 'canvas_cleared',
  CANVAS_STATE = 'canvas_state',
  
  // User interaction events
  CURSOR_MOVE = 'cursor_move',
  
  // Chat events
  CHAT_MESSAGE = 'chat:message',
  
  // System events
  ERROR = 'error',
}

export enum DrawingActions {
  ADD = 'add',
  MODIFY = 'modify',
  REMOVE = 'remove',
  CLEAR = 'clear',
}

export enum ObjectTypes {
  PATH = 'path',
  RECT = 'rect',
  CIRCLE = 'circle',
  TEXT = 'text',
  LINE = 'line',
  POLYLINE = 'polyline',
  POLYGON = 'polygon',
  GROUP = 'group',
}

export enum UserRoles {
  USER = 'user',
  ADMIN = 'admin',
}

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  ROOMS: {
    BASE: '/api/rooms',
    DETAILS: (id: number) => `/api/rooms/${id}`,
    JOIN: (id: number) => `/api/rooms/${id}/join`,
    LEAVE: (id: number) => `/api/rooms/${id}/leave`,
    CANVAS: (id: number) => `/api/rooms/${id}/canvas`,
    CANVAS_HISTORY: (id: number) => `/api/rooms/${id}/canvas/history`,
    CANVAS_STATE: (id: number) => `/api/rooms/${id}/canvas/state`,
  },
  USERS: {
    BASE: '/api/users',
    DETAILS: (id: number) => `/api/users/${id}`,
    PROFILE: '/api/users/profile',
  },
};