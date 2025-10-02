import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  SimulatedUser, 
  CursorPosition, 
  UserAction, 
  DEFAULT_USERS
} from '../types/multiUser';

/**
 * Custom hook for showing all user cursors simultaneously without user switching
 * This modified version only tracks cursor positions but does not allow switching users
 */
export const useCursorVisualization = () => {
  // Define the state structure
  const [state, setState] = useState<{
    users: SimulatedUser[];
    cursorPositions: Record<string, CursorPosition>;
    showCursors: boolean;
  }>({
    users: DEFAULT_USERS.map(user => ({
      ...user,
      isActive: false,
      lastActivity: new Date()
    })),
    cursorPositions: {},
    showCursors: true
  });

  // Reference to actual cursor DOM elements
  const cursorsRef = useRef<Record<string, HTMLElement>>({});

  // Get the currently logged in user (first user for now, to be replaced with actual user)
  const currentUser = useRef<SimulatedUser>(state.users[0]);
  
  // Initialize the current user based on login state
  useEffect(() => {
    // Here we would normally get the current user from auth state
    // For now, just set the first user as active
    const updatedUsers = state.users.map((user, index) => ({
      ...user,
      isActive: index === 0 // Only the first user (Admin) is active
    }));
    
    setState(prev => ({
      ...prev,
      users: updatedUsers
    }));
    
    currentUser.current = {
      ...state.users[0],
      isActive: true
    };
  }, []);

  // Get the current active user
  const getCurrentUser = useCallback((): SimulatedUser => {
    return currentUser.current;
  }, []);

  // Update cursor position for current user
  const updateCurrentUserCursor = useCallback((x: number, y: number, element?: HTMLElement) => {
    const user = getCurrentUser();
    
    const position: CursorPosition = {
      x,
      y,
      timestamp: new Date(),
      userId: user.id
    };

    // Store the updated position in state
    setState(prev => ({
      ...prev,
      cursorPositions: {
        ...prev.cursorPositions,
        [user.id]: position
      }
    }));

    // Always update visual cursor when possible
    if (element) {
      // This ensures the cursor DOM element gets created and updated
      updateVisualCursor(user.id, x, y, element);
    }

    // In a real implementation, this would emit the position to other users
    emitCursorUpdate(position);
  }, [getCurrentUser]);

  // Simulate other user's cursor movement
  // In a real implementation, this would come from socket events
  const updateOtherUserCursor = useCallback((otherUserId: string, x: number, y: number, element?: HTMLElement) => {
    // Find the other user
    const otherUser = state.users.find(u => u.id === otherUserId);
    if (!otherUser) return;
    
    const position: CursorPosition = {
      x,
      y,
      timestamp: new Date(),
      userId: otherUserId
    };

    setState(prev => ({
      ...prev,
      cursorPositions: {
        ...prev.cursorPositions,
        [otherUserId]: position
      }
    }));

    // Update visual cursor if element provided
    if (element) {
      updateVisualCursor(otherUserId, x, y, element);
    }
  }, [state.users]);

  // Toggle showing cursor
  const toggleShowCursors = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCursors: !prev.showCursors
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
    cursorElement.style.display = state.showCursors ? 'block' : 'none';
  }, [state.users, state.showCursors]);

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
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
    `;

    // Cursor icon
    const icon = document.createElement('div');
    icon.textContent = user.cursorIcon;
    icon.style.cssText = `
      font-size: 24px;
      filter: drop-shadow(0 0 3px ${user.color});
      text-shadow: 0 0 5px ${user.color}, 0 0 10px rgba(255,255,255,0.8);
    `;

    // User label
    const label = document.createElement('div');
    label.textContent = user.name;
    label.style.cssText = `
      background: ${user.color};
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 20px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
    
    // Store the last position persistently for each user
    setState(prev => {
      // Keep this cursor position stored even when not moving
      const updatedPositions = {
        ...prev.cursorPositions,
        [position.userId]: position
      };
      return {
        ...prev,
        cursorPositions: updatedPositions
      };
    });
    
    // SIMULATION: Move the other user's cursor in response
    // In a real implementation, this would be handled by socket events
    setTimeout(() => {
      // Find the other user (not the current user)
      const otherUser = state.users.find(u => u.id !== position.userId);
      if (otherUser) {
        // Create a simulated position nearby the current cursor
        const offsetX = Math.random() * 100 - 50; // Random offset between -50 and 50
        const offsetY = Math.random() * 100 - 50;
        
        updateOtherUserCursor(
          otherUser.id, 
          position.x + offsetX, 
          position.y + offsetY
        );
      }
    }, Math.random() * 500 + 200); // Random delay between 200-700ms for natural feel
  }, [state.users, updateOtherUserCursor]);

  // Cleanup cursors
  const cleanup = useCallback(() => {
    Object.values(cursorsRef.current).forEach(cursor => {
      cursor.remove();
    });
    cursorsRef.current = {};
  }, []);

  return {
    // State
    users: state.users,
    cursorPositions: state.cursorPositions,
    showCursors: state.showCursors,
    
    // Functions
    getCurrentUser,
    updateCurrentUserCursor,
    updateOtherUserCursor,
    toggleShowCursors,
    updateVisualCursor,
    cleanup
  };
};