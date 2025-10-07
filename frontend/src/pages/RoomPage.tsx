import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchRoomById } from '../store/slices/roomSlice';
import { fetchCanvas } from '../store/slices/canvasSlice';
import FigmaLikeLayout from '../components/FigmaLikeLayout';
import UserList from '../components/UserList';
import RoomSettings from '../components/RoomSettings';
import ChatPanel from '../components/ChatPanel';
import PropertiesPanel from '../components/PropertiesPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';

const RoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentRoom, loading: roomLoading, error: roomError } = useAppSelector(state => state.room);
  const { currentCanvas } = useAppSelector(state => state.canvas); // Keep currentCanvas for settings
  const { user, isAuthenticated, loading: authLoading } = useAppSelector(state => state.auth);
  
  // Stable user reference to prevent useEffect re-runs
  const userId = useMemo(() => user?.id, [user?.id]);
  
  const [showChat, setShowChat] = useState<boolean>(true);
  const [showUsers, setShowUsers] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'properties'>('chat');
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  
  // Wait for auth to be checked before doing anything
  useEffect(() => {
    if (!authLoading) {
      setAuthChecked(true);
    }
  }, [authLoading]);
  
  // Check if user is authenticated - but only after auth has been checked
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      console.log('🚪 RoomPage: User not authenticated, redirecting to login');
      navigate('/login', { state: { from: `/room/${id}` } });
    }
  }, [authChecked, isAuthenticated, navigate, id]);
  
  // Fetch room data only when authenticated and auth check is complete
  useEffect(() => {
    console.log('🔄 RoomPage useEffect triggered', { 
      id, 
      authChecked, 
      isAuthenticated, 
      userId: !!userId 
    });
    
    if (id && authChecked && isAuthenticated && userId) {
      console.log('🚀 Dispatching fetchRoomById...');
      dispatch(fetchRoomById(parseInt(id)));
      
      // Canvas component will handle its own state loading
      console.log('✅ Canvas will handle its own state loading');
    }
  }, [id, authChecked, isAuthenticated, userId, dispatch]);
  
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
  
  // Show loading state while authentication is being checked
  if (!authChecked || authLoading) {
    return <LoadingSpinner />;
  }
  
  // Show loading state while fetching room data (but NOT canvas loading)
  if (roomLoading) {
    return <LoadingSpinner />;
  }
  
  // Show error state for room errors (canvas manages its own errors)
  if (roomError) {
    return <ErrorAlert message={roomError || 'An error occurred'} />;
  }
  
  // If room doesn't exist, navigate back to rooms page
  if (!currentRoom) {
    return <ErrorAlert message="Room not found" />;
  }
  
  // Check if user is the room creator (for editing permissions)
  const isCreator = userId && currentRoom && currentRoom.creatorId === userId;
  
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
      
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar - Users */}
        {showUsers && (
          <div className="w-48 lg:w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
            <UserList roomId={parseInt(id || '0')} />
          </div>
        )}
        
        {/* Main canvas area - takes remaining space */}
        <div className="flex-1 min-w-0 min-h-0">
          <FigmaLikeLayout 
            key={`canvas-${id}`}
            roomId={parseInt(id || '0')} 
            readOnly={false}
          />
        </div>
        
        {/* Right sidebar - Chat and Properties (vertical with tabs) */}
        {showChat && (
          <div className="w-72 xl:w-80 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col">
            {/* Tab buttons */}
            <div className="flex border-b border-gray-200">
              <button
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  rightPanelTab === 'chat' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRightPanelTab('chat')}
              >
                💬 Chat
              </button>
              <button
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  rightPanelTab === 'properties' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRightPanelTab('properties')}
              >
                🎨 Properties
              </button>
            </div>
            
            {/* Tab content */}
            <div className="flex-1 min-h-0">
              {rightPanelTab === 'chat' ? (
                <ChatPanel roomId={parseInt(id || '0')} />
              ) : (
                <PropertiesPanel />
              )}
            </div>
          </div>
        )}
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