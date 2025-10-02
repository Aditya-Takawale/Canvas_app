import React from 'react';
import MultiUserCanvas from '../components/MultiUserCanvas';
import { UserAction } from '../types/multiUser';

const MultiUserDemoPage: React.FC = () => {
  const handleUserAction = (action: UserAction) => {
    console.log('User action:', action);
  };

  const handleCanvasChange = (canvas: any) => {
    console.log('Canvas initialized:', canvas);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎨 Multi-User Canvas Simulation
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            👥 How to Use Multi-User Simulation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-2">🔢 User Switching:</h3>
              <ul className="space-y-1">
                <li>• Press <kbd className="px-1 py-0.5 bg-blue-100 rounded">1-5</kbd> to switch to specific user</li>
                <li>• Press <kbd className="px-1 py-0.5 bg-blue-100 rounded">Tab</kbd> for next user</li>
                <li>• Press <kbd className="px-1 py-0.5 bg-blue-100 rounded">Shift+Tab</kbd> for previous user</li>
                <li>• Click user cards on the left panel</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">👁️ Cursor Controls:</h3>
              <ul className="space-y-1">
                <li>• Press <kbd className="px-1 py-0.5 bg-blue-100 rounded">C</kbd> to toggle all cursors</li>
                <li>• Each user has a unique cursor icon and color</li>
                <li>• Active user cursor has special effects</li>
                <li>• Cursor trails show movement history</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="max-w-7xl mx-auto">
        <MultiUserCanvas
          width={1000}
          height={600}
          backgroundColor="#ffffff"
          onCanvasChange={handleCanvasChange}
          onUserAction={handleUserAction}
          className="mb-8"
        />
      </div>

      {/* Features Overview */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              🎯 Individual Tracking
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Each user has unique ID and color</li>
              <li>• All actions are attributed to active user</li>
              <li>• Drawing styles match user colors</li>
              <li>• Real-time user identification</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              🖱️ Cursor Simulation
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Multiple visual cursors on single mouse</li>
              <li>• Smooth cursor trails and animations</li>
              <li>• User-specific cursor icons</li>
              <li>• Toggle visibility controls</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              ⌨️ Quick Switching
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Instant user switching with number keys</li>
              <li>• Tab navigation between users</li>
              <li>• Visual feedback for active user</li>
              <li>• Keyboard shortcut help system</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-gray-800 text-white rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">💡 Try These Actions:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">Drawing & Creating:</h4>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Switch to User 1 (press '1')</li>
                <li>Click "Draw" and draw something</li>
                <li>Switch to User 2 (press '2')</li>
                <li>Add a rectangle or circle</li>
                <li>Notice how each user's creations have their color!</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-green-300 mb-2">Cursor Interaction:</h4>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Press 'C' to show all cursors</li>
                <li>Switch between users (1-5) rapidly</li>
                <li>Watch cursor trails and animations</li>
                <li>See how the active user cursor pulses</li>
                <li>Move mouse to see real-time updates</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiUserDemoPage;