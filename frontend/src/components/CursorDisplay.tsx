import React from 'react';
import { SimulatedUser } from '../types/multiUser';

interface CursorDisplayProps {
  users: SimulatedUser[];
  showCursors: boolean;
  onToggleShowCursors: () => void;
  className?: string;
}

/**
 * A simplified component that just displays cursor information without user switching
 */
const CursorDisplay: React.FC<CursorDisplayProps> = ({
  users,
  showCursors,
  onToggleShowCursors,
  className = ''
}) => {
  const currentUser = users.find(user => user.isActive);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          👥 User Cursors
        </h3>
        <button
          onClick={onToggleShowCursors}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            showCursors 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Toggle cursor visibility"
        >
          {showCursors ? '👁️ Hide Cursors' : '👁️ Show Cursors'}
        </button>
      </div>

      {/* Current User Display */}
      {currentUser && (
        <div className="mb-4 p-3 rounded-lg border-2" style={{ borderColor: currentUser.color }}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{currentUser.avatar}</div>
            <div>
              <div className="font-semibold text-gray-800">You ({currentUser.name})</div>
              <div className="text-sm text-gray-600">Current User</div>
            </div>
            <div className="ml-auto text-2xl">{currentUser.cursorIcon}</div>
          </div>
        </div>
      )}

      {/* Other Users List */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600 mb-2">
          Other Users
        </div>
        <div className="grid grid-cols-1 gap-2">
          {users.filter(user => !user.isActive).map(user => (
            <div
              key={user.id}
              className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50"
            >
              {/* Avatar */}
              <div className="text-xl">{user.avatar}</div>
              
              {/* User Info */}
              <div className="flex-1">
                <div className="font-medium text-gray-800">{user.name}</div>
              </div>
              
              {/* Cursor Icon */}
              <div className="text-lg">{user.cursorIcon}</div>
              
              {/* Color Indicator */}
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: user.color }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">C</kbd> Toggle cursor visibility</div>
        </div>
      </div>
    </div>
  );
};

export default CursorDisplay;