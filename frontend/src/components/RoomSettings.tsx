import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { updateRoom } from '../store/slices/roomSlice';
import { updateCanvas } from '../store/slices/canvasSlice';
import { Room, Canvas } from '../interfaces/room';

interface RoomSettingsProps {
  room: Room;
  onClose: () => void;
  canvasId?: number;
}

const RoomSettings: React.FC<RoomSettingsProps> = ({ room, onClose, canvasId }) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.room);
  const { currentCanvas } = useAppSelector(state => state.canvas);

  // Room settings
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || '');
  const [isPrivate, setIsPrivate] = useState(room.isPrivate);
  const [joinCode, setJoinCode] = useState(room.joinCode || '');
  
  // Canvas settings
  const [canvasWidth, setCanvasWidth] = useState(currentCanvas?.width || 800);
  const [canvasHeight, setCanvasHeight] = useState(currentCanvas?.height || 600);
  
  // Form validation
  const [errors, setErrors] = useState<{
    name?: string;
    width?: string;
    height?: string;
  }>({});
  
  // Success message
  const [successMessage, setSuccessMessage] = useState('');
  
  // Generate a new join code
  const generateJoinCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setJoinCode(code);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: {
      name?: string;
      width?: string;
      height?: string;
    } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Room name is required';
    }
    
    if (canvasWidth < 200 || canvasWidth > 3000) {
      newErrors.width = 'Canvas width must be between 200 and 3000';
    }
    
    if (canvasHeight < 200 || canvasHeight > 3000) {
      newErrors.height = 'Canvas height must be between 200 and 3000';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    try {
      // Update room settings
      await dispatch(updateRoom({
        roomId: room.id,
        roomData: {
          name,
          description: description || null,
          isPrivate,
          joinCode: isPrivate ? joinCode : null,
        }
      }));
      
      // Update canvas settings if needed
      if (canvasId && (canvasWidth !== currentCanvas?.width || canvasHeight !== currentCanvas?.height)) {
        await dispatch(updateCanvas({
          roomId: room.id,
          canvasData: {
            id: canvasId,
            width: canvasWidth,
            height: canvasHeight,
          }
        }));
      }
      
      setSuccessMessage('Room settings updated successfully');
      
      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to update room settings:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Room Settings</h2>
          <button 
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {successMessage && (
          <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Room Name
            </label>
            <input
              id="room-name"
              name="room-name"
              type="text"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="room-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              id="room-description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Enter room description"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                id="private-room"
                name="private-room"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <label htmlFor="private-room" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Private Room (requires join code)
              </label>
            </div>
          </div>
          
          {isPrivate && (
            <div className="mb-4">
              <label htmlFor="join-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Join Code
              </label>
              <div className="flex">
                <input
                  id="join-code"
                  name="join-code"
                  type="text"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter join code"
                />
                <button
                  type="button"
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 px-3 py-2 rounded-r-md"
                  onClick={generateJoinCode}
                >
                  Generate
                </button>
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Canvas Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="canvas-width" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Width (px)
                </label>
                <input
                  id="canvas-width"
                  name="canvas-width"
                  type="number"
                  min="200"
                  max="3000"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.width ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={canvasWidth}
                  onChange={(e) => setCanvasWidth(parseInt(e.target.value))}
                />
                {errors.width && (
                  <p className="mt-1 text-sm text-red-500">{errors.width}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="canvas-height" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height (px)
                </label>
                <input
                  id="canvas-height"
                  name="canvas-height"
                  type="number"
                  min="200"
                  max="3000"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.height ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(parseInt(e.target.value))}
                />
                {errors.height && (
                  <p className="mt-1 text-sm text-red-500">{errors.height}</p>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Warning: Changing canvas dimensions may affect existing drawings.
            </p>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 mr-3"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomSettings;