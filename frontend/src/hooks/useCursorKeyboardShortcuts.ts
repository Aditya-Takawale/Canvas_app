import { useEffect, useCallback } from 'react';

interface CursorKeyboardShortcutsProps {
  onToggleCursors: () => void;
  isEnabled?: boolean;
}

/**
 * Simplified keyboard shortcuts hook that only handles cursor visibility toggling
 */
export const useCursorKeyboardShortcuts = ({
  onToggleCursors,
  isEnabled = true
}: CursorKeyboardShortcutsProps) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Prevent shortcuts when user is typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const { key, ctrlKey, altKey } = event;

    // Handle special key combinations
    if (key.toLowerCase() === 'c' && !ctrlKey && !altKey) {
      event.preventDefault();
      onToggleCursors();
      showNotification('Toggled cursor visibility', 'cursor-toggle');
    }
  }, [isEnabled, onToggleCursors]);

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

  notification.style.borderLeft = '4px solid #10B981';
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