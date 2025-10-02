// Multi-user types and interfaces for cursor tracking and user simulation

export interface SimulatedUser {
  id: string;
  name: string;
  color: string;
  cursorIcon: string;
  avatar: string;
  isActive: boolean;
  lastActivity: Date;
}

export interface CursorPosition {
  x: number;
  y: number;
  timestamp: Date;
  userId: string;
}

export interface UserAction {
  id: string;
  userId: string;
  type: 'draw' | 'select' | 'move' | 'delete' | 'create' | 'cursor';
  data: any;
  timestamp: Date;
  position?: { x: number; y: number };
}

export interface MultiUserState {
  users: SimulatedUser[];
  activeUserId: string;
  cursorPositions: Record<string, CursorPosition>;
  userActions: UserAction[];
  showAllCursors: boolean;
  isSimulationMode: boolean;
}

export interface CursorStyle {
  color: string;
  size: number;
  icon: string;
  trail: boolean;
  opacity: number;
}

// Registered user configurations
export const DEFAULT_USERS: Omit<SimulatedUser, 'isActive' | 'lastActivity'>[] = [
  {
    id: 'admin',
    name: 'Admin',
    color: '#3B82F6', // Blue
    cursorIcon: '�',
    avatar: '�‍�'
  },
  {
    id: 'user', 
    name: 'User',
    color: '#10B981', // Green
    cursorIcon: '�',
    avatar: '�'
  }
];

// Cursor appearance presets
export const CURSOR_PRESETS: Record<string, CursorStyle> = {
  default: {
    color: '#000000',
    size: 16,
    icon: '🖱️',
    trail: false,
    opacity: 1.0
  },
  collaborative: {
    color: '#3B82F6',
    size: 18,
    icon: '👆',
    trail: true,
    opacity: 0.8
  },
  creative: {
    color: '#F59E0B',
    size: 20,
    icon: '🎨',
    trail: true,
    opacity: 0.9
  }
};

export interface UserSwitchEvent {
  previousUserId: string;
  newUserId: string;
  timestamp: Date;
  method: 'keyboard' | 'click' | 'dropdown';
}