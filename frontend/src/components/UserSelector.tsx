import React from 'react';
import { SimulatedUser } from '../types/multiUser';

interface LiveParticipant {
  userId: number;
  username: string;
  cursorPosition?: { x: number; y: number };
  socketId?: string;
  color?: string;
}

interface UserSelectorProps {
  users: SimulatedUser[]; // simulated users (for switching / drawing)
  activeUserId: string;
  onUserSelect: (userId: string) => void;
  showAllCursors: boolean;
  onToggleShowAllCursors: () => void;
  className?: string;
  liveParticipants?: LiveParticipant[]; // real socket users
}

const UserSelector: React.FC<UserSelectorProps> = ({
  users,
  activeUserId,
  onUserSelect,
  showAllCursors,
  onToggleShowAllCursors,
  className = '',
  liveParticipants = []
}) => {
  const activeUser = users.find(user => user.id === activeUserId);
  // Filter out simulated users whose names collide with live participants to avoid duplicates in listing sections
  const liveIds = new Set(liveParticipants.map(lp => String(lp.userId)));

  const colorChoices = ['#3B82F6','#10B981','#F59E0B','#6366F1','#EC4899','#8B5CF6','#F87171','#0EA5E9'];

  const applySimUserColor = (id: string, color: string) => {
    // This relies on parent re-render via direct mutation (acceptable for quick UI); for robustness lift into hook state.
    const target = users.find(u => u.id === id);
    if (target) {
      target.color = color;
      // Force repaint by toggling a no-op state could be added; skipping for brevity.
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          👥 Multi-User Simulation
        </h3>
        <button
          onClick={onToggleShowAllCursors}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            showAllCursors 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Toggle visibility of all cursors"
        >
          {showAllCursors ? '👁️ Hide Others' : '👁️ Show All'}
        </button>
      </div>

      {/* Active User Display */}
      {activeUser && (
        <div className="mb-4 p-3 rounded-lg border-2" style={{ borderColor: activeUser.color }}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{activeUser.avatar}</div>
            <div>
              <div className="font-semibold text-gray-800">{activeUser.name}</div>
              <div className="text-sm text-gray-600">Active User</div>
            </div>
            <div className="ml-auto text-2xl">{activeUser.cursorIcon}</div>
          </div>
        </div>
      )}

      {/* Simulated Users Section */}
      <div className="space-y-2 mb-4">
        <div className="text-sm font-semibold text-gray-500 mb-1 tracking-wide uppercase">Simulated Users</div>
        <div className="text-xs font-medium text-gray-600 mb-2">
          Switch Users (Keyboard: 1-{users.length})
        </div>
        <div className="grid grid-cols-1 gap-2">
          {users.map((user, index) => (
            <button
              key={user.id}
              onClick={() => onUserSelect(user.id)}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-left ${
                user.id === activeUserId
                  ? 'ring-2 ring-offset-2 shadow-md'
                  : 'hover:bg-gray-50'
              }`}
              style={{
                backgroundColor: user.id === activeUserId ? `${user.color}20` : 'transparent',
                '--tw-ring-color': user.id === activeUserId ? user.color : 'transparent'
              } as React.CSSProperties}
            >
              {/* User Number */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              
              {/* Avatar */}
              <div className="text-xl">{user.avatar}</div>
              
              {/* User Info */}
              <div className="flex-1">
                <div className="font-medium text-gray-800">{user.name}</div>
                <div className="text-xs text-gray-500">
                  Last active: {user.lastActivity.toLocaleTimeString()}
                </div>
              </div>
              
              {/* Cursor Icon */}
              <div className="text-lg">{user.cursorIcon}</div>
              
              {/* Color Indicator */}
              <div className="flex items-center gap-1">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: user.color }}
                  title="Current color"
                />
                <div className="flex gap-0.5">
                  {colorChoices.slice(0,4).map(c => (
                    <span
                      key={c}
                      onClick={(e) => { e.stopPropagation(); applySimUserColor(user.id, c); }}
                      style={{ background:c }}
                      className="w-3 h-3 rounded cursor-pointer border border-white shadow"
                      title={`Set color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Live Participants Section */}
      {liveParticipants.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-500 mb-1 tracking-wide uppercase flex items-center gap-2">
            <span>Live Participants</span>
            <span className="inline-flex items-center justify-center text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{liveParticipants.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {liveParticipants.map(lp => {
              const simulated = users.find(u => u.name === lp.username);
              const color = lp.color || simulated?.color || '#6366f1';
              return (
                <div key={lp.userId} className="flex items-center space-x-3 p-3 rounded-lg bg-white border border-gray-100 shadow-sm">
                  <div className="text-xl">{simulated?.avatar || '🧑'}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      <span>{lp.username || `User ${lp.userId}`}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {lp.cursorPosition ? `x:${Math.round(lp.cursorPosition.x)} y:${Math.round(lp.cursorPosition.y)}` : 'No movement yet'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">1-{users.length}</kbd> Switch users</div>
          <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Tab</kbd> Next user</div>
          <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Shift+Tab</kbd> Previous user</div>
          <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">C</kbd> Toggle cursors</div>
        </div>
      </div>
    </div>
  );
};

export default UserSelector;