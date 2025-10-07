export enum SocketEvents {
  // Connection events
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_COUNT = 'user_count',
  
  // Drawing events
  DRAWING_EVENT = 'drawing_event',
  INSTANT_DRAWING = 'INSTANT_DRAWING', // Fast drawing like chat
  CANVAS_CLEARED = 'canvas_cleared',
  CANVAS_STATE = 'canvas_state',
  
  // User interaction events
  CURSOR_MOVE = 'cursor_move',
  
  // Chat events
  CHAT_MESSAGE = 'chat:message',
  
  // System events
  ERROR = 'error',
}

export enum UserRoles {
  USER = 'user',
  ADMIN = 'admin',
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