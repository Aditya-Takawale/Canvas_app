import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  SimulatedUser, 
  CursorPosition, 
  UserAction, 
  MultiUserState, 
  DEFAULT_USERS,
  UserSwitchEvent 
} from '../types/multiUser';

// Custom hook for managing multi-user simulation
export const useMultiUserSimulation = () => {
  const [state, setState] = useState<MultiUserState>({
    users: DEFAULT_USERS.map(user => ({
      ...user,
      isActive: false,
      lastActivity: new Date()
    })),
    activeUserId: DEFAULT_USERS[0].id,
    cursorPositions: {},
    userActions: [],
    showAllCursors: true,
    isSimulationMode: true
  });

  const actionIdRef = useRef(0);
  const cursorsRef = useRef<Record<string, HTMLElement>>({});

  // Initialize first user as active
  useEffect(() => {
    setActiveUser(DEFAULT_USERS[0].id);
  }, []);

  // Get active user
  const getActiveUser = useCallback((): SimulatedUser | undefined => {
    return state.users.find(user => user.id === state.activeUserId);
  }, [state.users, state.activeUserId]);

  // Set active user
  const setActiveUser = useCallback((userId: string) => {
    setState(prev => {
      const previousUserId = prev.activeUserId;
      
      // Update user states
      const updatedUsers = prev.users.map(user => ({
        ...user,
        isActive: user.id === userId,
        lastActivity: user.id === userId ? new Date() : user.lastActivity
      }));

      // Log user switch event
      const switchEvent: UserSwitchEvent = {
        previousUserId,
        newUserId: userId,
        timestamp: new Date(),
        method: 'keyboard' // Will be updated by calling function
      };
      
      console.log('User switched:', switchEvent);

      return {
        ...prev,
        users: updatedUsers,
        activeUserId: userId
      };
    });
  }, []);

  // Update cursor position for active user
  const updateCursorPosition = useCallback((x: number, y: number, element?: HTMLElement) => {
    const activeUser = getActiveUser();
    if (!activeUser) return;

    const position: CursorPosition = {
      x,
      y,
      timestamp: new Date(),
      userId: activeUser.id
    };

    setState(prev => ({
      ...prev,
      cursorPositions: {
        ...prev.cursorPositions,
        [activeUser.id]: position
      }
    }));

    // Update visual cursor if element provided
    if (element) {
      updateVisualCursor(activeUser.id, x, y, element);
    }

    // Emit cursor update to socket (if connected)
    emitCursorUpdate(position);
  }, [getActiveUser]);

  // Add user action
  const addUserAction = useCallback((
    type: UserAction['type'], 
    data: any, 
    position?: { x: number; y: number }
  ) => {
    const activeUser = getActiveUser();
    if (!activeUser) return;

    const action: UserAction = {
      id: `action-${++actionIdRef.current}`,
      userId: activeUser.id,
      type,
      data,
      timestamp: new Date(),
      position
    };

    setState(prev => ({
      ...prev,
      userActions: [...prev.userActions, action],
      users: prev.users.map(user => 
        user.id === activeUser.id 
          ? { ...user, lastActivity: new Date() }
          : user
      )
    }));

    console.log('User action:', action);
    return action;
  }, [getActiveUser]);

  // Switch to next user (cycling)
  const switchToNextUser = useCallback(() => {
    const currentIndex = state.users.findIndex(user => user.id === state.activeUserId);
    const nextIndex = (currentIndex + 1) % state.users.length;
    setActiveUser(state.users[nextIndex].id);
  }, [state.users, state.activeUserId, setActiveUser]);

  // Switch to previous user
  const switchToPreviousUser = useCallback(() => {
    const currentIndex = state.users.findIndex(user => user.id === state.activeUserId);
    const prevIndex = currentIndex === 0 ? state.users.length - 1 : currentIndex - 1;
    setActiveUser(state.users[prevIndex].id);
  }, [state.users, state.activeUserId, setActiveUser]);

  // Switch to user by number (1-5)
  const switchToUserByNumber = useCallback((userNumber: number) => {
    if (userNumber >= 1 && userNumber <= state.users.length) {
      setActiveUser(state.users[userNumber - 1].id);
    }
  }, [state.users, setActiveUser]);

  // Toggle showing all cursors
  const toggleShowAllCursors = useCallback(() => {
    setState(prev => ({
      ...prev,
      showAllCursors: !prev.showAllCursors
    }));
  }, []);

  // Update visual cursor position
  const updateVisualCursor = useCallback((userId: string, x: number, y: number, container: HTMLElement) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    // Get or create cursor element
    let cursorElement = cursorsRef.current[userId];
    if (!cursorElement) {
      cursorElement = createCursorElement(user);
      cursorsRef.current[userId] = cursorElement;
      container.appendChild(cursorElement);
    }

    // Update position
    cursorElement.style.left = `${x}px`;
    cursorElement.style.top = `${y}px`;
    cursorElement.style.display = state.showAllCursors ? 'block' : 
      (user.id === state.activeUserId ? 'block' : 'none');
  }, [state.users, state.activeUserId, state.showAllCursors]);

  // Create cursor DOM element
  const createCursorElement = useCallback((user: SimulatedUser): HTMLElement => {
    const cursor = document.createElement('div');
    cursor.className = 'multi-user-cursor';
    cursor.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.1s ease;
      transform: translate(-50%, -50%);
    `;

    // Cursor icon
    const icon = document.createElement('div');
    icon.textContent = user.cursorIcon;
    icon.style.cssText = `
      font-size: 20px;
      filter: drop-shadow(0 0 2px ${user.color});
    `;

    // User label
    const label = document.createElement('div');
    label.textContent = user.name;
    label.style.cssText = `
      background: ${user.color};
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 20px;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    cursor.appendChild(icon);
    cursor.appendChild(label);
    
    return cursor;
  }, []);

  // Emit cursor update to socket (placeholder for real implementation)
  const emitCursorUpdate = useCallback((position: CursorPosition) => {
    // This would integrate with your socket system
    // socket.emit('cursor-update', position);
    console.log('Cursor update emitted:', position);
  }, []);

  // Cleanup cursors
  const cleanup = useCallback(() => {
    Object.values(cursorsRef.current).forEach(cursor => {
      cursor.remove();
    });
    cursorsRef.current = {};
  }, []);

  // Get user stats
  const getUserStats = useCallback(() => {
    return {
      totalUsers: state.users.length,
      activeUser: getActiveUser(),
      totalActions: state.userActions.length,
      userActionCounts: state.users.map(user => ({
        user: user.name,
        count: state.userActions.filter(action => action.userId === user.id).length
      }))
    };
  }, [state.users, state.userActions, getActiveUser]);

  return {
    // State
    users: state.users,
    activeUserId: state.activeUserId,
    cursorPositions: state.cursorPositions,
    userActions: state.userActions,
    showAllCursors: state.showAllCursors,
    isSimulationMode: state.isSimulationMode,
    
    // Functions
    getActiveUser,
    setActiveUser,
    updateCursorPosition,
    addUserAction,
    switchToNextUser,
    switchToPreviousUser,
    switchToUserByNumber,
    toggleShowAllCursors,
    updateVisualCursor,
    cleanup,
    getUserStats
  };
};