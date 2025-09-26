import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchRoomById } from '../store/slices/roomSlice';
import { fetchCanvas } from '../store/slices/canvasSlice';
import Canvas from '../components/Canvas';
import BasicCanvas from '../components/BasicCanvas';
import MinimalCanvas from '../components/MinimalCanvas';
import StableCanvas from '../components/StableCanvas';
import PureMinimalCanvas from '../components/PureMinimalCanvas';
import SuperMinimalReactCanvas from '../components/SuperMinimalReactCanvas';
import UserList from '../components/UserList';
import RoomSettings from '../components/RoomSettings';
import ChatPanel from '../components/ChatPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';

const RoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentRoom, loading: roomLoading, error: roomError } = useAppSelector(state => state.room);
  const { currentCanvas, loading: canvasLoading, error: canvasError } = useAppSelector(state => state.canvas);
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  
  const [showChat, setShowChat] = useState<boolean>(true);
  const [showUsers, setShowUsers] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/room/${id}` } });
    }
  }, [isAuthenticated]);
  
  // Fetch room and canvas data - with duplicate prevention
  useEffect(() => {
    console.log('🔄 RoomPage useEffect triggered', { id, user: !!user, userId: user?.id });
    
    if (id && user) {
      console.log('🚀 Dispatching fetchRoomById...');
      dispatch(fetchRoomById(parseInt(id)));
      
      // TEMPORARILY DISABLE fetchCanvas to test if this is causing the issue
      console.log('⚠️ fetchCanvas DISABLED FOR TESTING');
      // dispatch(fetchCanvas(parseInt(id)));
    }
  }, [id, user?.id]); // Use user?.id instead of user to prevent object reference changes
  
  // Check if room exists and user has access
  useEffect(() => {
    if (!roomLoading && roomError) {
      navigate('/rooms', { state: { error: 'Room not found or you do not have access.' } });
    }
  }, [roomLoading, roomError]);
  
  const handleToggleChat = () => {
    setShowChat(!showChat);
  };
  
  const handleToggleUsers = () => {
    setShowUsers(!showUsers);
  };
  
  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Show loading state
  if (roomLoading || canvasLoading) {
    return <LoadingSpinner />;
  }
  
  // Show error state
  if (roomError || canvasError) {
    return <ErrorAlert message={roomError || canvasError || 'An error occurred'} />;
  }
  
  // If room doesn't exist, navigate back to rooms page
  if (!currentRoom) {
    return <ErrorAlert message="Room not found" />;
  }
  
  // Check if user is the room creator (for editing permissions)
  const isCreator = user && currentRoom.creatorId === user.id;
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
          <p className="text-gray-600 text-sm">{currentRoom.description}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={handleToggleUsers}
            title={showUsers ? 'Hide Users' : 'Show Users'}
          >
            👥
          </button>
          
          <button 
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={handleToggleChat}
            title={showChat ? 'Hide Chat' : 'Show Chat'}
          >
            💬
          </button>
          
          {isCreator && (
            <button 
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              onClick={handleToggleSettings}
              title="Room Settings"
            >
              ⚙️
            </button>
          )}
          
          <button 
            className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
            onClick={() => navigate('/rooms')}
            title="Leave Room"
          >
            🚪
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {showUsers && (
          <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
            <UserList roomId={parseInt(id || '0')} />
          </div>
        )}
        
        <div className="flex-1 flex flex-col">
          {/* Canvas area */}
          <div className="flex-1">
            {/* FIXED: Using StableCanvas with SIMPLE STYLING (no complex CSS) */}
            <StableCanvas 
              roomId={parseInt(id || '0')} 
              width={1200}
              height={800}
              readOnly={false}
            />
          </div>
          
          {/* Chat section below canvas */}
          {showChat && (
            <div className="h-64 bg-white border-t border-gray-200 flex-shrink-0">
              <ChatPanel roomId={parseInt(id || '0')} />
            </div>
          )}
        </div>
      </div>
      
      {showSettings && isCreator && (
        <RoomSettings 
          room={currentRoom} 
          onClose={handleToggleSettings} 
          canvasId={currentCanvas?.id} 
        />
      )}
    </div>
  );
};

export default RoomPage;