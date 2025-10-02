import React, { useEffect, useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchRooms, createRoom, joinRoom, deleteRoom } from '../store/slices/roomSlice';
import { Spinner } from '../components/common/Spinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { selectIsAuthenticated, selectUser } from '../store/slices/authSlice';
import { Dialog, Transition } from '@headlessui/react';

const RoomsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectUser);
  const { rooms, loading, error, pagination } = useAppSelector(state => state.room);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Join room modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  
  // Room created success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<any | null>(null);
  
  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Fetch rooms on mount and when page changes
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchRooms({ page, limit: 10, search: searchTerm }));
    }
  }, [dispatch, page, isAuthenticated]);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    dispatch(fetchRooms({ page: 1, limit: 10, search: searchTerm }));
  };
  
  // Handle create room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRoomName.trim()) {
      setFormError('Room name is required');
      return;
    }
    
    try {
      const resultAction = await dispatch(createRoom({
        name: newRoomName.trim(),
        description: newRoomDescription.trim() || undefined,
        isPrivate: newRoomIsPrivate,
        password: newRoomIsPrivate && newRoomPassword.trim() ? newRoomPassword.trim() : undefined,
      }));
      
      if (createRoom.fulfilled.match(resultAction)) {
        // Store the created room data
        setCreatedRoom(resultAction.payload.data);
        
        // Close create modal and show success modal
        setShowCreateModal(false);
        setNewRoomName('');
        setNewRoomDescription('');
        setNewRoomIsPrivate(false);
        setNewRoomPassword('');
        setFormError(null);
        
        // Show success modal with room details
        setShowSuccessModal(true);
        
        // Refresh the rooms list
        dispatch(fetchRooms({ page, limit: 10, search: searchTerm }));
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      setFormError('Failed to create room. Please try again.');
    }
  };

  // Handle join private room
  const handleJoinPrivateRoom = (roomId: number) => {
    setJoinRoomId(roomId);
    setJoinCode('');
    setJoinPassword('');
    setShowJoinModal(true);
  };

  // Handle join room submission
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinRoomId) return;
    
    try {
      const resultAction = await dispatch(joinRoom({
        roomId: joinRoomId,
        joinData: {
          joinCode: joinCode.trim() || undefined,
          password: joinPassword.trim() || undefined,
        }
      }));
      
      if (joinRoom.fulfilled.match(resultAction)) {
        // Navigate to the room
        navigate(`/room/${joinRoomId}`);
        setShowJoinModal(false);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      setFormError('Failed to join room. Please check your credentials.');
    }
  };

  // Handle delete room
  const handleDeleteRoom = async (roomId: number, roomName: string) => {
    if (!window.confirm(`Are you sure you want to delete the room "${roomName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const resultAction = await dispatch(deleteRoom(roomId));
      
      if (deleteRoom.fulfilled.match(resultAction)) {
        // Room was successfully deleted, state is already updated by reducer
        console.log('Room deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      setFormError('Failed to delete room. Please try again.');
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-indigo-700 to-purple-700 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Canvas Rooms</h1>
              <p className="mt-2 text-indigo-100">Create or join existing rooms to collaborate with your team</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Room
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Search and filters */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="sm:flex sm:items-center">
              <div className="relative rounded-md shadow-sm w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="room-search"
                  name="room-search"
                  type="text"
                  placeholder="Search rooms by name..."
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 py-3 sm:text-sm border-gray-300 rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          {/* Error message */}
          {error && <ErrorAlert message={error} />}
          
          {/* Loading state */}
          {loading && (
            <div className="flex justify-center my-12">
              <Spinner size="lg" />
            </div>
          )}
          
          {/* Rooms list */}
          {!loading && rooms.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No rooms found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new room for your team.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create a Room
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => (
                <div key={room.id} className="relative bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                  {/* Card header with gradient color based on room name */}
                  <div className="h-3 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                  {/* Delete button for room creators */}
                  {currentUser && room.creatorId === currentUser.id && (
                    <button
                      onClick={() => handleDeleteRoom(room.id, room.name)}
                      className="absolute top-4 right-2 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                      title="Delete room"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-bold text-gray-900 line-clamp-1">
                        {room.name}
                      </h2>
                      <div className="flex items-center space-x-2">
                        {room.isPrivate && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-amber-400" fill="currentColor" viewBox="0 0 8 8">
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {room.description && (
                      <p className="mt-3 text-sm text-gray-500 line-clamp-2">{room.description}</p>
                    )}
                    
                    <div className="mt-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100">
                            <span className="text-sm font-medium leading-none text-indigo-700">
                              {(room.creator?.username || 'U').charAt(0).toUpperCase()}
                            </span>
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {room.creator?.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created {formatDate(room.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-5">
                      {room.isPrivate ? (
                        <button
                          onClick={() => handleJoinPrivateRoom(room.id)}
                          className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Join with Code
                        </button>
                      ) : (
                        <Link
                          to={`/room/${room.id}`}
                          className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Enter Room
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center mt-12">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(page > 1 ? page - 1 : 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === i + 1
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => setPage(page < pagination.pages ? page + 1 : pagination.pages)}
                  disabled={page === pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Room Modal */}
      <Transition appear show={showCreateModal} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={() => setShowCreateModal(false)}>
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Create New Room
                </Dialog.Title>
                <button
                  className="absolute top-5 right-5 text-gray-400 hover:text-gray-500"
                  onClick={() => setShowCreateModal(false)}
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {formError && <ErrorAlert message={formError} />}
                
                <form onSubmit={handleCreateRoom} className="mt-4">
                  <div className="mb-4">
                    <label htmlFor="room-name" className="block text-sm font-medium text-gray-700">
                      Room Name *
                    </label>
                    <input
                      id="room-name"
                      name="room-name"
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter a name for your room"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="room-desc" className="block text-sm font-medium text-gray-700">
                      Description (optional)
                    </label>
                    <textarea
                      id="room-desc"
                      value={newRoomDescription}
                      onChange={(e) => setNewRoomDescription(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Describe the purpose of this room"
                      rows={3}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="private-room"
                          name="private-room"
                          type="checkbox"
                          checked={newRoomIsPrivate}
                          onChange={(e) => setNewRoomIsPrivate(e.target.checked)}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="private-room" className="font-medium text-gray-700">
                          Private Room
                        </label>
                        <p className="text-gray-500">Enable this if you want to restrict access with a join code.</p>
                      </div>
                    </div>
                  </div>
                  
                  {newRoomIsPrivate && (
                    <div className="mb-6">
                      <label htmlFor="room-password" className="block text-sm font-medium text-gray-700">
                        Room Password (optional)
                      </label>
                      <input
                        id="room-password"
                        name="room-password"
                        type="password"
                        value={newRoomPassword}
                        onChange={(e) => setNewRoomPassword(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter a password for extra security (optional)"
                      />
                      <p className="mt-1 text-xs text-gray-500">Leave empty for rooms that only require a join code</p>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={loading}
                    >
                      {loading ? 
                        <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>Creating...</> : 
                        'Create Room'
                      }
                    </button>
                  </div>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Join Private Room Modal */}
      <Transition appear show={showJoinModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setShowJoinModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Join Private Room
                  </Dialog.Title>
                  <button
                    className="absolute top-5 right-5 text-gray-400 hover:text-gray-500"
                    onClick={() => setShowJoinModal(false)}
                  >
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {formError && <ErrorAlert message={formError} />}

                  <form onSubmit={handleJoinRoom} className="mt-4">
                    <div className="mb-4">
                      <label htmlFor="join-code" className="block text-sm font-medium text-gray-700">
                        Room Join Code *
                      </label>
                      <input
                        id="join-code"
                        name="join-code"
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                        placeholder="Enter the room join code"
                        required
                      />
                    </div>

                    <div className="mb-6">
                      <label htmlFor="join-password" className="block text-sm font-medium text-gray-700">
                        Room Password (if required)
                      </label>
                      <input
                        id="join-password"
                        name="join-password"
                        type="password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                        placeholder="Enter room password (if required)"
                      />
                      <p className="mt-1 text-xs text-gray-500">Only required if the room has password protection</p>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowJoinModal(false)}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 mr-3"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                        disabled={loading}
                      >
                        {loading ? 
                          <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>Joining...</> : 
                          'Join Room'
                        }
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Room Created Success Modal */}
      <Transition appear show={showSuccessModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowSuccessModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    🎉 Room Created Successfully!
                  </Dialog.Title>
                  
                  {createdRoom && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Room Name:</p>
                        <p className="font-medium text-gray-900">{createdRoom.name}</p>
                      </div>
                      
                      {createdRoom.description && (
                        <div>
                          <p className="text-sm text-gray-600">Description:</p>
                          <p className="text-gray-900">{createdRoom.description}</p>
                        </div>
                      )}
                      
                      {createdRoom.isPrivate && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-amber-800 mb-2">
                            🔐 Private Room Details
                          </p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-amber-700">Room ID (Join Code):</p>
                              <div className="flex items-center space-x-2">
                                <code className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-mono">
                                  {createdRoom.joinCode}
                                </code>
                                <button
                                  onClick={() => navigator.clipboard.writeText(createdRoom.joinCode)}
                                  className="text-amber-600 hover:text-amber-700 text-xs"
                                >
                                  📋 Copy
                                </button>
                              </div>
                            </div>
                            {createdRoom.password && (
                              <p className="text-xs text-amber-700">
                                ✅ Password protection enabled
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-amber-600 mt-2">
                            💡 Share the Room ID with users who need to join this private room
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowSuccessModal(false)}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuccessModal(false);
                        if (createdRoom) {
                          navigate(`/room/${createdRoom.id}`);
                        }
                      }}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Enter Room
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default RoomsPage;