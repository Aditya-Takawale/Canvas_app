import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onSwitchToUser: (userNumber: number) => void;
  onNextUser: () => void;
  onPreviousUser: () => void;
  onToggleCursors: () => void;
  onToggleSimulation?: () => void;
  isEnabled?: boolean;
  maxUsers?: number;
}

export const useKeyboardShortcuts = ({
  onSwitchToUser,
  onNextUser,
  onPreviousUser,
  onToggleCursors,
  onToggleSimulation,
  isEnabled = true,
  maxUsers = 5
}: KeyboardShortcutsProps) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Prevent shortcuts when user is typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const { key, shiftKey, ctrlKey, altKey } = event;

    // Number keys (1-5) - Switch to specific user
    if (/^[1-9]$/.test(key)) {
      const userNumber = parseInt(key);
      if (userNumber <= maxUsers) {
        event.preventDefault();
        onSwitchToUser(userNumber);
        showNotification(`Switched to User ${userNumber}`, 'user-switch');
      }
      return;
    }

    // Handle special key combinations
    switch (key.toLowerCase()) {
      case 'tab':
        event.preventDefault();
        if (shiftKey) {
          onPreviousUser();
          showNotification('Previous User', 'user-switch');
        } else {
          onNextUser();
          showNotification('Next User', 'user-switch');
        }
        break;

      case 'c':
        if (!ctrlKey && !altKey) {
          event.preventDefault();
          onToggleCursors();
          showNotification('Toggled cursor visibility', 'cursor-toggle');
        }
        break;

      case 'escape':
        if (onToggleSimulation) {
          event.preventDefault();
          onToggleSimulation();
          showNotification('Toggled simulation mode', 'simulation-toggle');
        }
        break;

      case 'h':
        if (ctrlKey || altKey) {
          event.preventDefault();
          showHelpModal();
        }
        break;
    }
  }, [isEnabled, maxUsers, onSwitchToUser, onNextUser, onPreviousUser, onToggleCursors, onToggleSimulation]);

  useEffect(() => {
    if (isEnabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isEnabled]);

  return { handleKeyDown };
};

// Notification system for keyboard shortcuts
const showNotification = (message: string, type: string) => {
  // Remove any existing notifications
  const existing = document.querySelector('.keyboard-shortcut-notification');
  if (existing) {
    existing.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'keyboard-shortcut-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    pointer-events: none;
  `;

  // Add type-specific styling
  switch (type) {
    case 'user-switch':
      notification.style.borderLeft = '4px solid #3B82F6';
      break;
    case 'cursor-toggle':
      notification.style.borderLeft = '4px solid #10B981';
      break;
    case 'simulation-toggle':
      notification.style.borderLeft = '4px solid #F59E0B';
      break;
    default:
      notification.style.borderLeft = '4px solid #6B7280';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);

  // Animate out and remove
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
};

// Help modal for keyboard shortcuts
const showHelpModal = () => {
  // Remove existing modal
  const existing = document.querySelector('.keyboard-shortcuts-help');
  if (existing) {
    existing.remove();
    return;
  }

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'keyboard-shortcuts-help';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    width: 90%;
  `;

  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">⌨️ Keyboard Shortcuts</h3>
    <div style="space-y: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 500;">1-5</span>
        <span style="color: #6B7280;">Switch to User 1-5</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 500;">Tab</span>
        <span style="color: #6B7280;">Next User</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 500;">Shift + Tab</span>
        <span style="color: #6B7280;">Previous User</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 500;">C</span>
        <span style="color: #6B7280;">Toggle Cursor Visibility</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 500;">Escape</span>
        <span style="color: #6B7280;">Toggle Simulation Mode</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <span style="font-weight: 500;">Ctrl/Alt + H</span>
        <span style="color: #6B7280;">Show This Help</span>
      </div>
    </div>
    <button id="close-help" style="
      width: 100%;
      padding: 8px;
      background: #3B82F6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
    ">Close</button>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Close handlers
  const closeButton = content.querySelector('#close-help');
  const closeModal = () => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
};